import type { DataSource } from '#lib/components/frame/data-source.ts';
import { modelTier } from '#lib/stores/model-tier.svelte.ts';
import { browserModel, type BrowserModel } from './browser-model.svelte.ts';
import { BrowserProvider } from './browser-provider.ts';
import type { Capability } from './tiers.ts';
import type { TokenizerName } from './tokenizers.ts';

/** The tokenizer each kind of task needs (GPT-2 is the only next-token model). */
const TOKENIZERS: Partial<Record<Capability, TokenizerName>> = { 'next-token': 'gpt2' };

export type LiveState =
	| { state: 'recorded' }
	| { state: 'uncovered' }
	| { state: 'checking' }
	| { state: 'downloading'; fraction: number }
	| { state: 'failed'; message: string }
	| { state: 'starting' }
	| { state: 'stopped'; message: string }
	| { state: 'live'; device: 'webgpu' | 'wasm' };

/**
 * A widget's live option for one kind of task: whether the chosen model tier covers it, how far its
 * model has got, and the visitor's "Show the recording" switch for this widget.
 */
export class LiveOption {
	/** Per widget and page view: the visitor's switch back to the recording. Not saved. */
	showRecording = $state(false);
	readonly capability: Capability;
	/** The model the recording came from, for the badge. */
	readonly recorded: string;

	constructor(capability: Capability, recorded: string) {
		this.capability = capability;
		this.recorded = recorded;
	}

	/** The chosen tier's model for this task, if it covers it. */
	get model(): BrowserModel | null {
		const spec = modelTier.tier.covers[this.capability];
		return spec ? browserModel(spec) : null;
	}

	#provider = $derived.by(() => {
		const model = this.model;
		return model && new BrowserProvider(model, TOKENIZERS[this.capability] ?? null);
	});

	/** The live provider while the widget runs live; otherwise the widget uses its recording. */
	get provider(): BrowserProvider | null {
		return this.live ? this.#provider : null;
	}

	get state(): LiveState {
		const tier = modelTier.state;
		if (tier.state === 'recorded') return { state: 'recorded' };
		const model = this.model;
		if (!model) return { state: 'uncovered' };
		if (tier.state === 'checking') return { state: 'checking' };
		if (tier.state === 'downloading') return { state: 'downloading', fraction: tier.fraction };
		if (tier.state === 'error') return { state: 'failed', message: tier.message };
		const status = model.status;
		if (status.state === 'ready') return { state: 'live', device: status.device };
		if (status.state === 'error') return { state: 'stopped', message: status.message };
		return { state: 'starting' };
	}

	/** Whether the widget shows live results now. */
	get live(): boolean {
		return this.state.state === 'live' && !this.showRecording;
	}

	get source(): DataSource {
		const state = this.state;
		const tier = modelTier.tier.name;
		const model = this.model?.spec.label ?? '';
		switch (state.state) {
			case 'live':
				return this.showRecording
					? { kind: 'recorded', model: this.recorded }
					: { kind: 'live', model, tier };
			case 'recorded':
				return { kind: 'recorded', model: this.recorded };
			case 'uncovered':
				return { kind: 'recorded', note: `not in the ${tier} tier` };
			case 'checking':
			case 'downloading':
				return { kind: 'recorded', note: `downloading the ${tier} tier…` };
			case 'failed':
				return { kind: 'recorded', note: `the ${tier} tier didn't finish downloading` };
			case 'starting':
				return { kind: 'recorded', note: `starting ${model}…` };
			case 'stopped':
				return { kind: 'recorded', note: `${model} didn't start` };
		}
	}
}

/**
 * The live option for a widget that needs one kind of task, created during the widget's
 * initialization: its provider is live when the chosen tier covers the task and is ready. Once the
 * tier is downloaded, it starts the model in the inference worker.
 */
export function useProvider(capability: Capability, recorded: string): LiveOption {
	const option = new LiveOption(capability, recorded);
	$effect(() => {
		const model = option.model;
		if (modelTier.state.state === 'ready' && model?.status.state !== 'error') void model?.load();
	});
	return option;
}
