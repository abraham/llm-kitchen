import { describe, expect, it } from 'vitest';
import { isSlug } from '#lib/curriculum/index.ts';
import canonical from '../../../models/canonical.json';
import embedder from '../../../models/embedder.json';
import { CANONICAL_LIVE, DOWNLOADS, filesUrl, MINILM, originalUrl } from './downloads.ts';

describe('downloads', () => {
	it('lists every live model, with the size, commit, and files of its config', () => {
		expect(DOWNLOADS).toContain(CANONICAL_LIVE);
		expect(DOWNLOADS).toContain(MINILM);
		for (const [model, config] of [
			[CANONICAL_LIVE, canonical],
			[MINILM, embedder]
		] as const) {
			expect(model.modelMB).toBe(config.onnxMB);
			expect(model.onnxId).toBe(config.onnxId);
			expect(model.onnxRevision).toBe(config.onnxRevision);
			expect(model.onnxFiles).toEqual(config.onnxFiles);
			expect(model.huggingFaceId).toBe(config.huggingFaceId);
		}
	});

	it('names chapters that exist, and no chapter is called downloads', () => {
		for (const model of DOWNLOADS) {
			expect(model.chapters.length).toBeGreaterThan(0);
			for (const slug of model.chapters) expect(isSlug(slug), slug).toBe(true);
		}
		expect(isSlug('downloads')).toBe(false);
	});

	it('links only to Hugging Face, built from the config', () => {
		for (const model of DOWNLOADS) {
			expect(originalUrl(model)).toBe(`https://huggingface.co/${model.huggingFaceId}`);
			expect(filesUrl(model)).toBe(
				`https://huggingface.co/${model.onnxId}/tree/${model.onnxRevision}`
			);
		}
	});
});
