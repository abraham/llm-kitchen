const STORAGE_KEY = 'llm-kitchen:visited';

function read(): Set<string> {
	try {
		const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
		return new Set(raw ? (JSON.parse(raw) as string[]) : []);
	} catch {
		return new Set();
	}
}

/** Which chapters the visitor has opened, saved in localStorage. */
class Progress {
	#visited = $state<Set<string>>(new Set());
	#loaded = false;

	/** Load saved progress once; browser only (e.g. from an effect). */
	load() {
		if (this.#loaded) return;
		this.#loaded = true;
		this.#visited = read();
	}

	has(slug: string): boolean {
		return this.#visited.has(slug);
	}

	visit(slug: string) {
		this.load();
		if (this.#visited.has(slug)) return;
		this.#visited = new Set([...this.#visited, slug]);
		try {
			globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify([...this.#visited]));
		} catch {
			// Storage can be unavailable (private mode, quota); progress just isn't saved.
		}
	}
}

export const progress = new Progress();
