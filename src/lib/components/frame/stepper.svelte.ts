/** Which step of a multi-step animation is showing. Shared by buttons, keys, and scrolling. */
export class Stepper {
	#index = $state(0);
	readonly count: number;

	constructor(count: number, start = 0) {
		if (count < 1) throw new Error('A stepper needs at least one step');
		this.count = count;
		this.#index = Math.min(Math.max(start, 0), count - 1);
	}

	get index() {
		return this.#index;
	}

	get atStart() {
		return this.#index === 0;
	}

	get atEnd() {
		return this.#index === this.count - 1;
	}

	go(index: number) {
		this.#index = Math.min(Math.max(Math.round(index), 0), this.count - 1);
	}

	next() {
		this.go(this.#index + 1);
	}

	prev() {
		this.go(this.#index - 1);
	}

	reset() {
		this.#index = 0;
	}

	/** Arrow keys step; Home/End jump. Returns true if the key was handled. */
	handleKey(key: string): boolean {
		const actions: Record<string, () => void> = {
			ArrowRight: () => this.next(),
			ArrowLeft: () => this.prev(),
			Home: () => this.go(0),
			End: () => this.go(this.count - 1)
		};
		actions[key]?.();
		return key in actions;
	}
}
