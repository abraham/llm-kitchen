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
});
