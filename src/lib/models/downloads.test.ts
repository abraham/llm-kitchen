import { describe, expect, it } from 'vitest';
import { isSlug } from '#lib/curriculum/index.ts';
import assistant from '../../../models/assistant.json';
import canonical from '../../../models/canonical.json';
import clip from '../../../models/clip.json';
import embedder from '../../../models/embedder.json';
import encoder from '../../../models/encoder.json';
import {
	ASSISTANT_LIVE,
	BERT_LIVE,
	CANONICAL_LIVE,
	CLIP_TEXT,
	DOWNLOADS,
	filesUrl,
	MINILM,
	originalUrl
} from './downloads.ts';

describe('downloads', () => {
	it('lists every live model, with the size, commit, and files of its config', () => {
		const pairs = [
			[CANONICAL_LIVE, canonical],
			[MINILM, embedder],
			[BERT_LIVE, encoder],
			[CLIP_TEXT, clip],
			[ASSISTANT_LIVE, assistant]
		] as const;
		expect(DOWNLOADS).toEqual(pairs.map(([model]) => model));
		for (const [model, config] of pairs) {
			expect(model.modelMB).toBe(config.onnxMB);
			expect(model.onnxId).toBe(config.onnxId);
			expect(model.onnxRevision).toBe(config.onnxRevision);
			expect(model.onnxFiles).toEqual(config.onnxFiles);
			expect(model.huggingFaceId).toBe(config.huggingFaceId);
		}
		expect(CLIP_TEXT.file).toBe('text_model');
		expect(CLIP_TEXT.dtype).toBe(clip.onnxDtype);
		expect(ASSISTANT_LIVE.dtype).toBe(assistant.onnxDtype);
		expect(Object.keys(ASSISTANT_LIVE.onnxFiles)).toContain('onnx/model_q4.onnx');
		expect(Object.keys(CLIP_TEXT.onnxFiles)).toContain('onnx/text_model_q4.onnx');
		expect(Object.keys(CLIP_TEXT.onnxFiles)).not.toContain('onnx/vision_model_quantized.onnx');
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
