import { canonical } from './provider.ts';
import type { Trace } from './trace.ts';

const t = (id: number, text: string) => ({ id, text });

// Hand-written for demos and tests; NOT model output. Token ids and probabilities are made up.
const the = t(1, 'The');
const cat = t(2, ' cat');
const sat = t(3, ' sat');
const on = t(4, ' on');
const theLower = t(5, ' the');
const mat = t(6, ' mat');
const floor = t(7, ' floor');
const bed = t(8, ' bed');
const sofa = t(9, ' sofa');
const dot = t(10, '.');
const and = t(11, ' and');
const comma = t(12, ',');

const prompt = [the, cat, sat, on, theLower];

export const sampleTrace: Trace = {
	version: 1,
	kind: 'sample',
	model: canonical.id,
	modelDisplayName: 'made-up model',
	prompt: 'The cat sat on the',
	tokens: prompt,
	steps: [
		{
			context: prompt,
			candidates: [
				{ token: mat, prob: 0.4 },
				{ token: floor, prob: 0.25 },
				{ token: bed, prob: 0.15 },
				{ token: sofa, prob: 0.1 }
			],
			rest: 0.1,
			chosen: mat
		},
		{
			context: [...prompt, mat],
			candidates: [
				{ token: dot, prob: 0.55 },
				{ token: and, prob: 0.25 },
				{ token: comma, prob: 0.15 }
			],
			rest: 0.05,
			chosen: dot
		}
	]
};
