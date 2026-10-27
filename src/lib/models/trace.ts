import type { Attention, GenerationStep, Token } from './provider.ts';

/** A recorded (or hand-written sample) run of a model on one prompt, stored as JSON. */
export interface Trace {
	version: 1;
	/** `recorded` traces come from a real model run; `sample` traces are made up for illustration. */
	kind: 'recorded' | 'sample';
	model: string;
	modelDisplayName: string;
	prompt: string;
	/** The prompt split into the model's tokens. */
	tokens: Token[];
	/** Step i is the distribution after the prompt plus the first i chosen tokens. */
	steps: GenerationStep[];
	attention?: Attention;
	settings?: { topK: number; temperature: number; seed?: number; frequencyPenalty?: number };
	generatedAt?: string;
	/** Where a recorded trace came from (model repo, revision, library version). */
	source?: { huggingFaceId: string; revision: string | null; torch?: string };
}

function fail(message: string): never {
	throw new Error(`Invalid trace: ${message}`);
}

function isToken(value: unknown): value is Token {
	const t = value as Token;
	return (
		typeof t === 'object' && t !== null && Number.isInteger(t.id) && typeof t.text === 'string'
	);
}

/** Validate untrusted JSON as a Trace. Throws with a readable message if it isn't one. */
export function parseTrace(json: unknown): Trace {
	const t = json as Trace;
	if (typeof t !== 'object' || t === null) fail('not an object');
	if (t.version !== 1) fail(`unsupported version ${String(t.version)}`);
	if (t.kind !== 'recorded' && t.kind !== 'sample') fail('kind must be recorded or sample');
	if (typeof t.prompt !== 'string' || typeof t.model !== 'string') fail('missing prompt/model');
	if (!Array.isArray(t.tokens) || !t.tokens.every(isToken)) fail('tokens');
	if (t.tokens.map((tok) => tok.text).join('') !== t.prompt) fail('tokens do not spell the prompt');
	if (!Array.isArray(t.steps) || t.steps.length === 0) fail('steps');

	t.steps.forEach((step, i) => {
		if (!isToken(step.chosen)) fail(`step ${i} chosen`);
		if (!Array.isArray(step.candidates) || step.candidates.length === 0)
			fail(`step ${i} candidates`);
		let total = step.rest;
		for (const c of step.candidates) {
			if (!isToken(c.token) || !(c.prob >= 0 && c.prob <= 1)) fail(`step ${i} candidate`);
			total += c.prob;
		}
		if (Math.abs(total - 1) > 1e-3) fail(`step ${i} probabilities sum to ${total.toFixed(4)}`);
		const expected = [...t.tokens, ...t.steps.slice(0, i).map((s) => s.chosen)];
		if (step.context.map((tok) => tok.id).join() !== expected.map((tok) => tok.id).join()) {
			fail(`step ${i} context does not match the prompt plus earlier choices`);
		}
	});

	if (t.attention) {
		const { tokens, weights } = t.attention;
		for (const layer of weights) {
			for (const head of layer) {
				head.forEach((row, q) => {
					if (row.length !== tokens.length) fail('attention row length');
					const sum = row.reduce((a, b) => a + b, 0);
					if (Math.abs(sum - 1) > 1e-2) fail(`attention row ${q} sums to ${sum}`);
					if (row.some((w, k) => k > q && w > 1e-6)) fail('attention looks at future tokens');
				});
			}
		}
	}
	return t;
}

/** The text of the prompt plus the first `n` generated tokens. */
export function textAfter(trace: Trace, n: number): string {
	return (
		trace.prompt +
		trace.steps
			.slice(0, n)
			.map((s) => s.chosen.text)
			.join('')
	);
}
