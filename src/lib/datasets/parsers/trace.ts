import { type Check, type Infer, array, integer, number, object, string } from '../check.ts';
import { parseTrace, type Trace } from '../../models/trace.ts';
import { candidate, token } from './common.ts';

/** A recorded GPT-2 run; `parseTrace` also checks probabilities, context, and attention. */
export const trace: Check<Trace> = (v, path) => {
	try {
		return parseTrace(v);
	} catch (e) {
		throw new Error(`${path || 'data'}: ${(e as Error).message}`, { cause: e });
	}
};

export const tokenVectors = object({
	model: string,
	modelDisplayName: string,
	prompt: string,
	tokens: array(token),
	dimensions: integer,
	tokenEmbeddings: array(array(number)),
	positionEmbeddings: array(array(number)),
	lastTokenByLayer: array(array(number)),
	/** For each entry of lastTokenByLayer: the top next-token guesses if the model stopped there. */
	logitLens: array(array(candidate))
});
export type TokenVectors = Infer<typeof tokenVectors>;
