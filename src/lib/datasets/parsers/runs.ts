import type { KVCacheRun } from '../../harness/cache.ts';
import type { HallucinationSamples } from '../../harness/hallucination.ts';
import type { InjectionLab } from '../../harness/injection.ts';
import type { RoutingRecording } from '../../harness/routing.ts';
import type { QuantizeRun } from '../../math/quantize.ts';
import type { SpeculativeRecording } from '../../math/speculative.ts';
import {
	type Check,
	array,
	derive,
	dictionary,
	integer,
	literal,
	nullable,
	number,
	object,
	string,
	tuple
} from '../check.ts';
import { answerVerdict, matchesAccepted } from '../../grading/answers.ts';
import { followedInjection } from '../../grading/checks.ts';
import { candidate, modelRef, token } from './common.ts';

export const kvCacheRun: Check<KVCacheRun> = object({
	model: modelRef,
	prompt: string,
	promptTokens: array(token),
	generated: array(token),
	maxScoreDifference: number,
	device: string,
	repeats: integer,
	msPerToken: object({ cache: array(number), noCache: array(number) }),
	totalMs: object({ cache: number, noCache: number })
});

const span = tuple(integer, integer);
const labeled = object({ id: string, label: string });

export const injectionLab: Check<InjectionLab> = object({
	model: modelRef,
	documents: array(object({ id: string, kind: string, title: string, claim: string })),
	attacks: array(labeled),
	defenses: array(labeled),
	/** Token ids of each chat marker, for counting the markers the model read. */
	markerIds: dictionary(array(integer)),
	runs: array(
		derive(
			object({
				doc: string,
				attack: string,
				defense: string,
				prompt: string,
				documentSpan: span,
				attackSpan: nullable(span),
				markerTokens: integer,
				reply: string
			}),
			(r) => ({ ...r, followed: followedInjection(r.doc, r.reply) })
		)
	)
});

export const quantizeRun: Check<QuantizeRun> = object({
	version: literal(1),
	model: modelRef,
	prompt: string,
	passage: string,
	parameters: integer,
	block: integer,
	scaleBits: integer,
	sample: object({ layer: string, max: number }),
	precisions: array(
		object({
			label: string,
			bits: integer,
			kind: literal('float', 'int'),
			bytes: integer,
			candidates: array(candidate),
			generated: array(token),
			loss: number,
			row: array(number)
		})
	),
	generatedAt: string
});

const speculativeModel = object({
	id: string,
	displayName: string,
	revision: nullable(string),
	parameters: integer
});

export const speculativeRecording: Check<SpeculativeRecording> = object({
	version: literal(1),
	drafter: speculativeModel,
	target: speculativeModel,
	draft: integer,
	newTokens: integer,
	runs: array(
		object({
			prompt: string,
			tokens: array(token),
			written: array(token),
			rounds: array(object({ guesses: array(token), kept: integer, added: token }))
		})
	),
	generatedAt: string
});

const routingModel = object({
	id: string,
	displayName: string,
	revision: nullable(string),
	parameters: integer
});

const routingAnswer = object({
	answer: string,
	tokens: integer,
	confidence: number
});

export const routingRecording: Check<RoutingRecording> = object({
	version: literal(1),
	system: string,
	small: routingModel,
	big: routingModel,
	questions: array(
		derive(
			object({
				question: string,
				accepted: array(string),
				small: routingAnswer,
				big: routingAnswer
			}),
			(q) => ({
				...q,
				small: { ...q.small, correct: matchesAccepted(q.small.answer, q.accepted) },
				big: { ...q.big, correct: matchesAccepted(q.big.answer, q.accepted) }
			})
		)
	)
});

const sampledAnswer = object({ text: string });
const sampledAnswers = array(sampledAnswer);

export const hallucinationSamples: Check<HallucinationSamples> = object({
	version: literal(1),
	model: modelRef,
	settings: dictionary(number),
	seed: integer,
	prompts: array(object({ id: literal('plain', 'allowed'), system: string })),
	questions: array(
		derive(
			object({
				id: string,
				kind: literal('known', 'obscure', 'invented'),
				question: string,
				accepted: array(string),
				truth: nullable(string),
				answers: object({ plain: sampledAnswers, allowed: sampledAnswers }),
				greedy: object({ plain: sampledAnswer, allowed: sampledAnswer })
			}),
			(q) => {
				const graded = (a: { text: string }) => ({
					...a,
					verdict: answerVerdict(a.text, q.accepted)
				});
				return {
					...q,
					answers: { plain: q.answers.plain.map(graded), allowed: q.answers.allowed.map(graded) },
					greedy: { plain: graded(q.greedy.plain), allowed: graded(q.greedy.allowed) }
				};
			}
		)
	)
});
