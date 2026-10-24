import { parseLevel, type Level } from '#lib/levels.ts';
import { applyChoice, appliedChoice } from './root-choice.ts';

/**
 * The explanation level chosen in the app bar. Simple and In depth are saved in localStorage, and
 * an inline script in app.html applies them before the page paints; Standard saves nothing.
 */
class LevelStore {
	#current = $state<Level>('standard');
	#loaded = false;

	get current() {
		return this.#current;
	}

	/** Browser only (e.g. from an effect). */
	load() {
		if (this.#loaded) return;
		this.#loaded = true;
		this.#current = parseLevel(appliedChoice('level')) ?? 'standard';
	}

	set(level: Level) {
		applyChoice('level', level === 'standard' ? undefined : level);
		this.#current = level;
	}
}

export const level = new LevelStore();
