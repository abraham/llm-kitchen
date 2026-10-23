/// <reference lib="webworker" />
// Trains the Ch 7 character-level model off the main thread, so the page stays responsive.
import { RHYMES } from '#lib/data/rhymes.ts';
import { CharModel, CharTrainer, charExamples, sampleChars } from '#lib/math/mlp.ts';
import { seededRandom } from '#lib/math/sampling.ts';

export type TrainerRequest =
	{ type: 'start' } | { type: 'pause' } | { type: 'reset'; seed: number };

export type TrainerResponse =
	| { type: 'info'; parameters: number; vocabSize: number; examples: number }
	| { type: 'progress'; step: number; loss: number; sample?: string; done: boolean };

const MAX_STEPS = 6000;
const BATCH = 32;
const texts = RHYMES.map((r) => r.text.toLowerCase());
// Index 0 is a padding/end marker; the rest are the characters in the rhymes.
const vocab = ['\u0000', ...[...new Set(texts.join(''))].sort()];
const examples = charExamples(texts, vocab, 3);

let random = seededRandom(1);
let trainer = new CharTrainer(new CharModel({ vocab, context: 3, embedding: 8, hidden: 64 }, 1));
let running = false;

function post(message: TrainerResponse) {
	self.postMessage(message);
}

function info() {
	post({
		type: 'info',
		parameters: trainer.model.parameterCount,
		vocabSize: vocab.length,
		examples: examples.length
	});
}

function loop() {
	if (!running) return;
	let loss = 0;
	for (let i = 0; i < 25; i++) {
		const batch = Array.from(
			{ length: BATCH },
			() => examples[Math.floor(random() * examples.length)]
		);
		loss += trainer.step(batch, 0.01) / 25;
	}
	const done = trainer.steps >= MAX_STEPS;
	const sample =
		trainer.steps % 250 === 0 || done ? sampleChars(trainer.model, 80, random) : undefined;
	post({ type: 'progress', step: trainer.steps, loss, sample, done });
	if (done) running = false;
	else setTimeout(loop, 0);
}

self.onmessage = (event: MessageEvent<TrainerRequest>) => {
	const request = event.data;
	if (request.type === 'start' && !running && trainer.steps < MAX_STEPS) {
		running = true;
		loop();
	} else if (request.type === 'pause') {
		running = false;
	} else if (request.type === 'reset') {
		running = false;
		random = seededRandom(request.seed);
		trainer = new CharTrainer(
			new CharModel({ vocab, context: 3, embedding: 8, hidden: 64 }, request.seed)
		);
		info();
		post({
			type: 'progress',
			step: 0,
			loss: trainer.model.lossAndGrad(examples).loss,
			sample: sampleChars(trainer.model, 80, random),
			done: false
		});
	}
};

info();
