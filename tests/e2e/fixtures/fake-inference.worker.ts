/// <reference lib="webworker" />
// A stand-in for the inference worker in the end-to-end build: it answers every request at once,
// from made-up numbers, and downloads nothing. Pages use it when localStorage has FAKE_INFERENCE.
import { DOWNLOADS } from '#lib/models/downloads.ts';
import { MODEL_CACHE, pinnedUrl } from '#lib/models/model-cache.ts';
import type { WorkerRequest, WorkerResponse } from '#lib/workers/inference.worker.ts';

/** GPT-2 ids and texts of the fake next tokens, likeliest first. */
const NEXT = [
	[8390, ' fake'],
	[2107, ' live'],
	[1332, ' test'],
	[8824, ' moon']
] as const;
const NEXT_PROBS = [0.4, 0.3, 0.2, 0.1];
const FILLS = ['fake', 'live', 'test'];

/**
 * A chat reply: given the calculator and a sum, a call to it; given its result, the result; given
 * plain text, " fake fake"; otherwise "Fake reply."
 */
function reply(request: Extract<WorkerRequest, { type: 'generate' }>): string {
	const last = request.messages?.at(-1);
	if (!last) return ' fake fake';
	if (last.role === 'tool') return `The answer is ${last.content}.`;
	const sum = /\d+\s*[-+*/×÷]\s*\d+/.exec(last.content)?.[0];
	if (request.tools?.length && sum) {
		return `<tool_call>\n${JSON.stringify({ name: 'calculator', arguments: { expression: sum } })}\n</tool_call>`;
	}
	return 'Fake reply.';
}

function post(message: WorkerResponse) {
	self.postMessage(message);
}

/** A unit vector that depends only on the text, so the same words land in the same place. */
function vector(text: string, size: number): number[] {
	let seed = 0;
	for (const c of text) seed = (seed * 31 + c.charCodeAt(0)) >>> 0;
	const v = Array.from({ length: size }, (_, i) => Math.sin(seed + i * 12.9898));
	const norm = Math.hypot(...v);
	return v.map((x) => x / norm);
}

self.onmessage = async ({ data: request }: MessageEvent<WorkerRequest>) => {
	const { id } = request;
	if (request.type === 'download') {
		const model = DOWNLOADS.find((m) => m.onnxId === request.model)!;
		const cache = await caches.open(MODEL_CACHE);
		for (const path of Object.keys(model.onnxFiles)) {
			post({ id, type: 'progress', file: path, loaded: 1, total: 1 });
			await cache.put(pinnedUrl(model, path), new Response('fake'));
		}
		post({ id, type: 'downloaded' });
	} else if (request.type === 'load') {
		post({ id, type: 'loaded', device: 'wasm' });
	} else if (request.type === 'next-token') {
		const top = NEXT.slice(0, request.topK).map(([token], i) => ({
			id: token,
			prob: NEXT_PROBS[i]
		}));
		post({ id, type: 'distribution', top, rest: 1 - top.reduce((a, t) => a + t.prob, 0) });
	} else if (request.type === 'embed') {
		post({ id, type: 'embedded', vectors: request.texts.map((t) => vector(t, 384)) });
	} else if (request.type === 'embed-text') {
		post({ id, type: 'embedded', vectors: request.texts.map((t) => vector(t, 512)) });
	} else if (request.type === 'fill-mask') {
		const top = FILLS.slice(0, request.topK).map((text, i) => ({
			id: i,
			text,
			prob: 0.5 / (i + 1)
		}));
		post({ id, type: 'filled', top });
	} else if (request.type === 'generate') {
		const text = reply(request);
		const half = Math.ceil(text.length / 2);
		post({ id, type: 'progress', text: text.slice(0, half) });
		post({ id, type: 'progress', text: text.slice(half) });
		const prompt = request.text ?? JSON.stringify(request.messages);
		post({ id, type: 'generated', prompt, text: text.trim(), tokens: 3, stopped: true });
	} else if (request.type === 'score') {
		post({ id, type: 'scored', p: 0.5 });
	}
};
