import type { Slug } from '#lib/curriculum/index.ts';
import type { PinnedModel } from '#lib/workers/verified-fetch.ts';
import canonical from '../../../models/canonical.json';
import embedder from '../../../models/embedder.json';

/** A model the site can download and run in the visitor's browser (tier T2). */
export interface DownloadableModel extends PinnedModel {
	label: string;
	/** What it does, in a few words. */
	does: string;
	task: 'embed' | 'next-token';
	/** ONNX file to load instead of the default. */
	file?: string;
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
	chapters: ['generating-text', 'quirks-and-limits', 'prompts-as-documents']
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

/** Every model the site can download, in the order the Downloads page lists them. */
export const DOWNLOADS: readonly DownloadableModel[] = [CANONICAL_LIVE, MINILM];

/** The original model's card: what it is, its license, and its authors. */
export const originalUrl = (model: DownloadableModel) =>
	`https://huggingface.co/${model.huggingFaceId}`;

/** The exact commit of ONNX files the site downloads. */
export const filesUrl = (model: DownloadableModel) =>
	`https://huggingface.co/${model.onnxId}/tree/${model.onnxRevision}`;
