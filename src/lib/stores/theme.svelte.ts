import { applyChoice, appliedChoice } from './root-choice.ts';

export type Theme = 'light' | 'dark';
export type ThemeChoice = 'auto' | Theme;

/** The order the app bar's toggle steps through. */
export const THEME_CHOICES: readonly ThemeChoice[] = ['auto', 'light', 'dark'];

/** A saved theme, or null for anything else in storage. */
export function parseTheme(raw: string | null | undefined): Theme | null {
	return raw === 'light' || raw === 'dark' ? raw : null;
}

/**
 * Auto (the system setting), light, or dark, chosen in the app bar. Light and dark are saved in
 * localStorage, and an inline script in app.html applies them before the page paints; auto saves
 * nothing.
 */
class ThemeStore {
	#choice = $state<ThemeChoice>('auto');
	#loaded = false;

	get choice() {
		return this.#choice;
	}

	/** Browser only (e.g. from an effect). */
	load() {
		if (this.#loaded) return;
		this.#loaded = true;
		this.#choice = parseTheme(appliedChoice('theme')) ?? 'auto';
		syncThemeColor(this.#choice);
	}

	/** Step to the next choice: auto, light, dark, then auto again. */
	next() {
		const choice = THEME_CHOICES[(THEME_CHOICES.indexOf(this.#choice) + 1) % THEME_CHOICES.length];
		applyChoice('theme', choice === 'auto' ? undefined : choice);
		this.#choice = choice;
		syncThemeColor(choice);
	}
}

/** Browser chrome follows the choice too: each theme-color tag applies always, never, or by system. */
function syncThemeColor(choice: ThemeChoice) {
	for (const meta of globalThis.document.querySelectorAll<HTMLMetaElement>(
		'meta[name="theme-color"][data-scheme]'
	)) {
		const scheme = meta.dataset.scheme;
		meta.media =
			choice === 'auto'
				? `(prefers-color-scheme: ${scheme})`
				: choice === scheme
					? 'all'
					: 'not all';
	}
}

export const theme = new ThemeStore();
