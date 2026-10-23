import { type Infer, array, integer, number, object, record, string } from '../check.ts';
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
