import { browserModel, type BrowserModel } from '#lib/models/browser-model.svelte.ts';
import { parseTier, tier, tierModels, type Tier, type TierId } from '#lib/models/tiers.ts';

const STORAGE_KEY = 'llm-kitchen:models';

export type TierState =
	| { state: 'recorded' }
	| { state: 'checking' }
	| { state: 'downloading'; fraction: number }
	| { state: 'ready' }
	| { state: 'error'; message: string };

/**
 * The model tier chosen on the Models page (docs/spec/model-tiers.md), saved in localStorage. The
 * default, Recorded, saves nothing. Choosing a tier downloads all of its models.
 */
class ModelTierStore {
	#choice = $state<TierId>('recorded');
	#problem = $state<string | null>(null);
	#loaded = false;

	get choice(): TierId {
		return this.#choice;
	}

	get tier(): Tier {
		return tier(this.#choice);
	}

	/** The chosen tier's models (none for Recorded). */
	get models(): BrowserModel[] {
		return tierModels(this.tier).map(browserModel);
	}

	/** Downloaded MB of the chosen tier's models. */
	get doneMB(): number {
		return this.models.reduce((a, m) => {
			if (m.cached) return a + m.spec.modelMB;
			return m.status.state === 'downloading' ? a + m.status.fraction * m.spec.modelMB : a;
		}, 0);
	}

	get totalMB(): number {
		return this.models.reduce((a, m) => a + m.spec.modelMB, 0);
	}

	get state(): TierState {
		if (this.#choice === 'recorded') return { state: 'recorded' };
		if (this.#problem) return { state: 'error', message: this.#problem };
		const models = this.models;
		// A cached model that fails to start is the widget's problem (TierStatus), not the download's.
		const failed = models.find((m) => m.status.state === 'error' && !m.cached);
		if (failed?.status.state === 'error') {
			return { state: 'error', message: `${failed.spec.label}: ${failed.status.message}` };
		}
		// Without a Cache API nothing is kept, so a tier is ready at once and each model downloads as it starts.
		if (models.every((m) => m.cached || !m.keepsDownloads || m.status.state === 'ready')) {
			return { state: 'ready' };
		}
		if (models.some((m) => m.cached === null)) return { state: 'checking' };
		return { state: 'downloading', fraction: this.totalMB ? this.doneMB / this.totalMB : 0 };
	}

	/** Browser only (e.g. from an effect). Resumes the chosen tier's download if it didn't finish. */
	load() {
		if (this.#loaded) return;
		this.#loaded = true;
		try {
			this.#choice = parseTier(globalThis.localStorage?.getItem(STORAGE_KEY));
		} catch {
			this.#choice = 'recorded';
		}
		if (this.#choice !== 'recorded') void this.download();
	}

	/** Saves the choice and, for a tier, downloads its models: choosing it is the visitor's click. */
	choose(id: TierId) {
		this.#choice = id;
		this.#problem = null;
		try {
			if (id === 'recorded') globalThis.localStorage?.removeItem(STORAGE_KEY);
			else globalThis.localStorage?.setItem(STORAGE_KEY, id);
		} catch {
			// Storage can be unavailable (private mode, quota); the choice lasts for this page only.
		}
		if (id !== 'recorded') void this.download();
	}

	/** Downloads the chosen tier's missing models, one after another, stopping at the first failure. */
	async download() {
		this.#problem = null;
		const models = this.models;
		await Promise.all(models.map((m) => m.check()));
		const missing = models.filter((m) => !m.cached && m.keepsDownloads);
		if (!missing.length) return;
		const needMB = missing.reduce((a, m) => a + m.spec.modelMB, 0);
		const freeMB = await freeSpaceMB();
		if (freeMB !== null && freeMB < needMB) {
			this.#problem = `It needs ${needMB} MB, and this browser has about ${freeMB} MB free for this site.`;
			return;
		}
		for (const model of missing) {
			if (!(await model.download())) return;
		}
	}
}

async function freeSpaceMB(): Promise<number | null> {
	try {
		const { quota, usage } = (await navigator.storage?.estimate?.()) ?? {};
		return quota === undefined ? null : Math.floor((quota - (usage ?? 0)) / 1e6);
	} catch {
		return null;
	}
}

export const modelTier = new ModelTierStore();
