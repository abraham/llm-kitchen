import { describe, expect, it } from 'vitest';
import { readDataset } from '#lib/datasets/read.ts';

describe('encoders', () => {
	const d = readDataset('encoders/fill-mask');

	it('BERT uses the words after the blank; GPT-2 cannot', () => {
		const [fridge, bread] = d.sentences;
		expect(fridge.gpt2[0].text).toBe(' floor');
		expect(fridge.bert[0].text).toBe('top');
		expect(bread.gpt2[0].text).toBe(' hospital');
		expect(bread.bert[0].text).toBe('market');
	});

	it('the mask grid sentence has the blank at token 6 of 10', () => {
		const tokens: string[] = d.sentences[0].tokens;
		expect(tokens).toHaveLength(10);
		expect(tokens.indexOf('[MASK]')).toBe(5);
	});

	it('in depth: the dog: GPT-2 guesses a new line (1.4%), BERT dog (61%); "wagged" splits', () => {
		const dog = d.sentences[3];
		expect(dog.tokens).toEqual([
			'the',
			'[MASK]',
			'wa',
			'##gged',
			'its',
			'tail',
			'and',
			'barked',
			'.'
		]);
		expect(dog.gpt2[0]).toMatchObject({ text: '\n' });
		expect(dog.gpt2[0].p).toBeCloseTo(0.014, 3);
		expect(dog.bert[0]).toMatchObject({ text: 'dog' });
		expect(dog.bert[0].p).toBeCloseTo(0.61, 2);
	});

	it('in depth: over 10 tokens, the causal mask allows 55 of 100 pairs', () => {
		const n = d.sentences[0].tokens.length;
		let allowed = 0;
		for (let i = 0; i < n; i++) for (let j = 0; j <= i; j++) allowed++;
		expect([allowed, n * n]).toEqual([55, 100]);
	});
});
