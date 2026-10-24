import type { DecisionRecording } from '../../math/decision.ts';
import {
	type Check,
	type Infer,
	array,
	dictionary,
	integer,
	number,
	object,
	record,
	string
} from '../check.ts';
import { guess, modelRef } from './common.ts';

export const fillMask = object({
	models: record(['bert', 'gpt2'], modelRef),
	sentences: array(
		object({
			sentence: string,
			before: string,
			tokens: array(string),
			bert: array(guess),
			gpt2: array(guess)
		})
	)
});
export type FillMask = Infer<typeof fillMask>;

export const clip = object({
	model: modelRef,
	imageSize: integer,
	patchSize: integer,
	grid: integer,
	patchDimensions: integer,
	embeddingDimensions: integer,
	images: array(object({ name: string, file: string, patches: array(array(number)) })),
	captions: array(object({ text: string, similarity: array(number), probability: array(number) }))
});
export type Clip = Infer<typeof clip>;

const tensor: Check<number[] | number[][]> = (v, path) =>
	Array.isArray(v) && Array.isArray(v[0]) ? array(array(number))(v, path) : array(number)(v, path);

export const decisionRecording: Check<DecisionRecording> = object({
	model: modelRef,
	world: object({
		size: integer,
		start: integer,
		goal: integer,
		pits: array(integer),
		moves: array(string),
		horizon: integer,
		rewards: object({ step: integer, goal: integer, pit: integer })
	}),
	training: object({
		runs: integer,
		byPlayer: dictionary(integer),
		byOutcome: dictionary(integer),
		returns: dictionary(integer),
		steps: integer
	}),
	net: object({
		width: integer,
		layers: integer,
		heads: integer,
		returnScale: number,
		steps: integer,
		finalLoss: number,
		weights: dictionary(tensor)
	}),
	checks: array(
		object({
			target: integer,
			actions: array(integer),
			return: integer,
			end: integer,
			firstScores: array(number)
		})
	)
});
