import { describe, expect, it } from 'vitest';
import { describePromptDiffChunk, diffPromptLayouts } from './prompt-diff.ts';

describe('diffPromptLayouts', () => {
	const base = 'Review: A delight from start to finish.\nSentiment: positive\n';
	const arrow = 'A delight from start to finish. -> positive\n';
	const brackets = '[A delight from start to finish.] [positive]\n';

	it('keeps the review and label unchanged while isolating removed/added wrapper text', () => {
		const diff = diffPromptLayouts(base, arrow);
		const same = diff
			.filter((c) => c.kind === 'same')
			.map((c) => c.text)
			.join('');
		expect(same).toContain('A delight from start to finish.');
		expect(same).toContain('positive');
		expect(diff.some((c) => c.kind === 'removed' && c.text.includes('Review:'))).toBe(true);
		expect(diff.some((c) => c.kind === 'added' && c.text.includes('->'))).toBe(true);
	});

	it('isolates brackets added around unchanged review and label', () => {
		const diff = diffPromptLayouts(base, brackets);
		expect(diff.some((c) => c.kind === 'added' && c.text === '[')).toBe(true);
		expect(diff.some((c) => c.kind === 'added' && c.text.includes(']'))).toBe(true);
		const desc = describePromptDiffChunk(
			diff.find((c) => c.kind === 'removed')!,
			'Review: … Sentiment: …',
			'Text / label in brackets',
			7,
			4,
			8
		);
		expect(desc).toContain('7 of 8 → 4 of 8');
	});
});
