import { describe, expect, it } from 'vitest';
import { seededRandom } from '#lib/math/sampling.ts';
import type { BrowserModel } from './browser-model.svelte.ts';
import { BrowserProvider } from './browser-provider.ts';
import { NotAvailableError, canonical } from './provider.ts';
import { RecordedProvider } from './recorded.ts';
import { sampleTrace } from './sample-trace.ts';
import { parseTrace, textAfter } from './trace.ts';

describe('parseTrace', () => {
	it('accepts the sample trace', () => {
		expect(parseTrace(structuredClone(sampleTrace))).toEqual(sampleTrace);
	});

	it('rejects probabilities that do not sum to 1', () => {
		const bad = structuredClone(sampleTrace);
		bad.steps[0].rest = 0.5;
		expect(() => parseTrace(bad)).toThrow(/sum to/);
	});

	it('rejects tokens that do not spell the prompt', () => {
		const bad = structuredClone(sampleTrace);
		bad.prompt = 'The dog sat on the';
		expect(() => parseTrace(bad)).toThrow(/spell the prompt/);
	});

	it('rejects a step whose context skips an earlier choice', () => {
		const bad = structuredClone(sampleTrace);
		bad.steps[1].context = sampleTrace.tokens;
		expect(() => parseTrace(bad)).toThrow(/context/);
	});

	it('rejects attention that looks ahead', () => {
		const bad = structuredClone(sampleTrace);
		bad.attention = {
			tokens: bad.tokens.slice(0, 2),
			weights: [
				[
					[
						[0.5, 0.5],
						[0.5, 0.5]
					]
				]
			]
		};
		expect(() => parseTrace(bad)).toThrow(/future/);
	});
});

describe('RecordedProvider', () => {
	const provider = new RecordedProvider([sampleTrace]);

	it('labels sample data honestly', () => {
		expect(provider.source).toEqual({ kind: 'sample' });
	});

	it('answers for the prompt and for prefixes of the recorded run', async () => {
		const first = await provider.nextTokenDistribution('The cat sat on the');
		expect(first.candidates[0].token.text).toBe(' mat');
		const second = await provider.nextTokenDistribution(textAfter(sampleTrace, 1));
		expect(second.candidates[0].token.text).toBe('.');
	});

	it('moves dropped candidates into rest when limiting top k', async () => {
		const d = await provider.nextTokenDistribution('The cat sat on the', { topK: 2 });
		expect(d.candidates).toHaveLength(2);
		expect(d.rest).toBeCloseTo(0.1 + 0.15 + 0.1);
	});

	it('replays the recorded choices', async () => {
		const steps = await provider.generate('The cat sat on the', { maxTokens: 5 });
		expect(steps.map((s) => s.chosen.text)).toEqual([' mat', '.']);
	});

	it('samples among recorded candidates when given a random source', async () => {
		const [step] = await provider.generate('The cat sat on the', {
			maxTokens: 1,
			random: seededRandom(1)
		});
		expect(step.candidates.map((c) => c.token.id)).toContain(step.chosen.id);
	});

	it('refuses prompts it has no recording for', async () => {
		await expect(provider.tokenize('Hello')).rejects.toBeInstanceOf(NotAvailableError);
	});

	it('answers for the exact tokens so far, like the live provider', async () => {
		const d = await provider.nextTokenDistribution(sampleTrace.tokens);
		expect(d).toEqual(await provider.nextTokenDistribution(sampleTrace.prompt));
	});
});

describe('BrowserProvider', () => {
	const seen: number[][] = [];
	const model = {
		spec: { label: 'Fake GPT-2' },
		nextToken: async (ids: number[], topK: number) => {
			seen.push(ids);
			return { top: [{ id: 3797, prob: 0.6 }].slice(0, topK), rest: 0.4 };
		},
		embed: async (texts: string[]) => texts.map(() => [1, 0])
	} as unknown as BrowserModel;
	const live = new BrowserProvider(model, 'gpt2');

	it('says it is live', () => {
		expect(live.source).toEqual({ kind: 'live', model: 'Fake GPT-2' });
	});

	it('tokenizes text, asks the model, and names the candidate tokens', async () => {
		const d = await live.nextTokenDistribution('The cat');
		expect(d.context.map((t) => t.text)).toEqual(['The', ' cat']);
		expect(d.candidates).toEqual([{ token: { id: 3797, text: ' cat' }, prob: 0.6 }]);
		expect(d.rest).toBe(0.4);
	});

	it('only sends the last context-window of tokens', async () => {
		const long = Array.from({ length: canonical.contextLength + 5 }, (_, i) => ({
			id: i,
			text: 'x'
		}));
		await live.nextTokenDistribution(long);
		expect(seen.at(-1)).toEqual(long.slice(5).map((t) => t.id));
	});

	it('generates by appending the top token', async () => {
		const steps = await live.generate('The cat', { maxTokens: 2 });
		expect(steps.map((s) => s.chosen.text)).toEqual([' cat', ' cat']);
		expect(steps[1].context).toHaveLength(3);
	});

	it('embeds through the model, and refuses to predict without a tokenizer', async () => {
		const embedder = new BrowserProvider(model);
		expect(await embedder.embed(['cat'])).toEqual([[1, 0]]);
		await expect(embedder.nextTokenDistribution('cat')).rejects.toBeInstanceOf(NotAvailableError);
	});
});
