import type { FewShotLabels } from '#lib/datasets/parsers/prompts.ts';

export type LabelsModel = 'gpt2' | 'qwen';

/** How one model answered the test reviews after one way of labeling the examples. */
export function summarizeLabels(rec: FewShotLabels, model: LabelsModel, condition: string) {
	const rows = rec.results[model][condition];
	// The first label of each condition stands for "positive" (positive, or foo).
	const saysPositive = rows.map(([a, b]) => a > b);
	const realSentiment = saysPositive.filter(
		(p, i) => p === (rec.tests[i].label === 'positive')
	).length;
	const labelShare = rows.reduce((s, [a, b]) => s + a + b, 0) / rows.length;
	const positives = saysPositive.filter(Boolean).length;
	return {
		tests: rows.length,
		realSentiment,
		labelShare,
		sameForAll: positives === 0 || positives === rows.length
	};
}
