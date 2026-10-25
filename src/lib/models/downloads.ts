import type { Slug } from '#lib/curriculum/index.ts';
import type { PinnedModel } from '#lib/workers/verified-fetch.ts';
import assistant from '../../../models/assistant.json';
import canonical from '../../../models/canonical.json';
import clip from '../../../models/clip.json';
import embedder from '../../../models/embedder.json';
import encoder from '../../../models/encoder.json';

/** A model the site can download and run in the visitor's browser (tier T2). */
export interface DownloadableModel extends PinnedModel {
	label: string;
	/** What it does, in a few words. */
	does: string;
	/** The kind of task it runs in the inference worker. */
	task: 'next-token' | 'embed' | 'fill-mask' | 'image-text' | 'chat';
	/** ONNX file to load instead of the default. */
	file?: string;
	/** The weights' precision: 8-bit unless a model keeps its answers better at 4. */
	dtype?: 'q8' | 'q4';
	/** The model the ONNX files were converted from. */
	huggingFaceId: string;
	/** Size of the listed files, in MB (10^6 bytes); the runtime comes on top. */
	modelMB: number;
	/** Chapters with a widget that runs it. */
	chapters: readonly Slug[];
}

/** The canonical small model, compressed to 8 bits. */
export const CANONICAL_LIVE: DownloadableModel = {
	label: `${canonical.displayName} (8-bit)`,
	does: 'Predicts the next token',
	task: 'next-token',
	file: canonical.onnxFile,
	huggingFaceId: canonical.huggingFaceId,
	onnxId: canonical.onnxId,
	onnxRevision: canonical.onnxRevision,
	onnxFiles: canonical.onnxFiles,
	modelMB: canonical.onnxMB,
	chapters: [
		'guessing-game',
		'probability-and-sampling',
		'generating-text',
		'quirks-and-limits',
		'prompts-as-documents',
		'encoders',
		'predictor-to-assistant',
		'few-shot'
	]
};

export const MINILM: DownloadableModel = {
	label: embedder.displayName,
	does: 'Turns a sentence into a point',
	task: 'embed',
	huggingFaceId: embedder.huggingFaceId,
	onnxId: embedder.onnxId,
	onnxRevision: embedder.onnxRevision,
	onnxFiles: embedder.onnxFiles,
	modelMB: embedder.onnxMB,
	chapters: ['embeddings']
};

export const BERT_LIVE: DownloadableModel = {
	label: `${encoder.displayName} (8-bit)`,
	does: 'Fills in a blank, reading both sides',
	task: 'fill-mask',
	huggingFaceId: encoder.huggingFaceId,
	onnxId: encoder.onnxId,
	onnxRevision: encoder.onnxRevision,
	onnxFiles: encoder.onnxFiles,
	modelMB: encoder.onnxMB,
	chapters: ['encoders']
};

/** Only CLIP's text half: the pictures' embeddings are recorded. At 8 bits it loses colors. */
export const CLIP_TEXT: DownloadableModel = {
	label: `${clip.displayName} text half (4-bit)`,
	does: 'Turns a caption into a point it can compare with pictures',
	task: 'image-text',
	file: clip.onnxFile,
	dtype: clip.onnxDtype as 'q4',
	huggingFaceId: clip.huggingFaceId,
	onnxId: clip.onnxId,
	onnxRevision: clip.onnxRevision,
	onnxFiles: clip.onnxFiles,
	modelMB: clip.onnxMB,
	chapters: ['seeing-pictures']
};

/**
 * A chat model for the Harnesses chapters. They recorded Qwen2.5-1.5B-Instruct, but its browser
 * exports either write "!!!!" on WebGPU (16-bit activations) or don't fit in memory (32-bit).
 */
export const ASSISTANT_LIVE: DownloadableModel = {
	label: `${assistant.displayName} (4-bit)`,
	does: 'Chats in its template, follows instructions, and calls tools',
	task: 'chat',
	dtype: assistant.onnxDtype as 'q4',
	huggingFaceId: assistant.huggingFaceId,
	onnxId: assistant.onnxId,
	onnxRevision: assistant.onnxRevision,
	onnxFiles: assistant.onnxFiles,
	modelMB: assistant.onnxMB,
	chapters: ['predictor-to-assistant', 'instructions-and-roles', 'few-shot', 'tools']
};

/** Every model the site can download, in the order the Models page lists them. */
export const DOWNLOADS: readonly DownloadableModel[] = [
	CANONICAL_LIVE,
	MINILM,
	BERT_LIVE,
	CLIP_TEXT,
	ASSISTANT_LIVE
];

/** The original model's card: what it is, its license, and its authors. */
export const originalUrl = (model: DownloadableModel) =>
	`https://huggingface.co/${model.huggingFaceId}`;

/** The exact commit of ONNX files the site downloads. */
export const filesUrl = (model: DownloadableModel) =>
	`https://huggingface.co/${model.onnxId}/tree/${model.onnxRevision}`;
