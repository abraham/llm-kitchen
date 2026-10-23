import { describe, expect, it } from 'vitest';
import { chapter } from '#lib/curriculum/index.ts';
import { COLLECTIONS, MEMORY_MODELS, decodeName } from '#lib/chapters/picking-a-model/data.ts';
import { weightBytes } from '#lib/math/quantize.ts';

describe('picking a model', () => {
	const ids = COLLECTIONS.flatMap((c) => c.ids);
	const kinds = (id: string) => decodeName(id).parts.map((p) => `${p.text}:${p.kind}`);

	it('splits every listed name into known parts that spell it back', () => {
		for (const id of ids) {
			const { org, parts } = decodeName(id);
			expect([org, parts.map((p) => p.text).join('-')].join('/')).toBe(id);
			for (const p of parts) {
				expect(p.meaning, `${id} ${p.text}`).toMatch(/\.$/);
				for (const s of p.chapters)
					expect(chapter(s).number).toBeLessThan(chapter('picking-a-model').number);
			}
		}
	});

	it('reads sizes, tuning, drafters, and quantization', () => {
		expect(kinds('google/gemma-4-26B-A4B-it')).toEqual([
			'gemma-4:family',
			'26B:size',
			'A4B:active',
			'it:tuning'
		]);
		expect(kinds('google/gemma-4-E2B-it-qat-mobile-transformers')).toEqual([
			'gemma-4:family',
			'E2B:effective',
			'it:tuning',
			'qat:quantization',
			'mobile:quantization',
			'transformers:format'
		]);
		expect(kinds('google/gemma-4-31B-it-assistant').at(-1)).toBe('assistant:drafter');
		expect(decodeName('google/gemma-4-E2B').base).toBe(true);
		expect(decodeName('Qwen/Qwen2.5-1.5B-Instruct').base).toBe(false);
		expect(decodeName('google/diffusiongemma-26B-A4B-it').parts[0].chapters).toEqual(['diffusion']);
		expect(kinds('deepseek-ai/DeepSeek-R1-Distill-Qwen-1.5B')).toEqual([
			'DeepSeek-R1:family',
			'Distill:tuning',
			'Qwen:family',
			'1.5B:size'
		]);
		expect(decodeName('deepseek-ai/DeepSeek-R1-Distill-Llama-8B').base).toBe(false);
	});

	it('matches the model cards: 30.7B weights take about 61 GB at 16 bits and 15 GB at 4', () => {
		const big = MEMORY_MODELS.find((m) => m.name === 'Gemma 4 31B')!;
		expect(Math.round(weightBytes(big.stored, 16) / 1e9)).toBe(61);
		expect(Math.round(weightBytes(big.stored, 4) / 1e9)).toBe(15);
		const moe = MEMORY_MODELS.find((m) => m.name === 'Gemma 4 26B A4B')!;
		expect([moe.stored, moe.perToken]).toEqual([25.2e9, 3.8e9]);
	});
});
