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
 * A widget's live option for the kinds of task it needs: whether the chosen model tier covers them,
 * how far their models have got, and the visitor's "Show the recording" switch for this widget.
 */
export class LiveOption {
	/** Per widget and page view: the visitor's switch back to the recording. Not saved. */
	showRecording = $state(false);
	readonly capabilities: readonly Capability[];
	/** The model the recording came from, for the badge. */
	readonly recorded: string;

	constructor(capabilities: Capability | readonly Capability[], recorded: string) {
		this.capabilities = typeof capabilities === 'string' ? [capabilities] : capabilities;
		this.recorded = recorded;
	}

	/** The chosen tier's model for each task, in order, or `null` if it doesn't cover them all. */
	get models(): BrowserModel[] | null {
		const covers = modelTier.tier.covers;
		const specs = this.capabilities.map((c) => covers[c]);
		return specs.every((s) => s !== undefined) ? specs.map(browserModel) : null;
	}

	/** The models' names, for the badge and status line. */
	get label(): string {
		return this.models?.map((m) => m.spec.label).join(' and ') ?? '';
	}

	#providers = $derived.by(() =>
		this.models?.map((m, i) => new BrowserProvider(m, TOKENIZERS[this.capabilities[i]] ?? null))
	);

	/** The live provider for the first task while the widget runs live; otherwise `null`. */
	get provider(): BrowserProvider | null {
		return this.providerFor(this.capabilities[0]);
	}

	/** The live provider for one of the tasks while the widget runs live; otherwise `null`. */
	providerFor(capability: Capability): BrowserProvider | null {
		return this.live ? (this.#providers?.[this.capabilities.indexOf(capability)] ?? null) : null;
	}

	/** Starts every model that isn't running or failed to start; after a failure, the retry. */
	start(): void {
		for (const model of this.models ?? []) void model.load();
	}

	get state(): LiveState {
		const tier = modelTier.state;
		if (tier.state === 'recorded') return { state: 'recorded' };
		const models = this.models;
		if (!models) return { state: 'uncovered' };
		if (tier.state === 'checking') return { state: 'checking' };
		if (tier.state === 'downloading') return { state: 'downloading', fraction: tier.fraction };
		if (tier.state === 'error') return { state: 'failed', message: tier.message };
		const statuses = models.map((m) => m.status);
		const failed = statuses.find((s) => s.state === 'error');
		if (failed?.state === 'error') return { state: 'stopped', message: failed.message };
		if (statuses.every((s) => s.state === 'ready')) {
			return { state: 'live', device: statuses[0].state === 'ready' ? statuses[0].device : 'wasm' };
		}
		return { state: 'starting' };
	}

	/** Whether the widget shows live results now. */
	get live(): boolean {
		return this.state.state === 'live' && !this.showRecording;
	}

	get source(): DataSource {
		const state = this.state;
		const tier = modelTier.tier.name;
		const model = this.label;
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
 * The live option for a widget that needs some kinds of task, created during the widget's
 * initialization: its providers are live when the chosen tier covers the tasks and is ready. Once
 * the tier is downloaded, it starts the models in the inference worker.
 */
export function useProvider(
	capabilities: Capability | readonly Capability[],
	recorded: string
): LiveOption {
	const option = new LiveOption(capabilities, recorded);
	$effect(() => {
		if (modelTier.state.state !== 'ready') return;
		for (const model of option.models ?? []) {
			if (model.status.state !== 'error') void model.load();
		}
	});
	return option;
}
