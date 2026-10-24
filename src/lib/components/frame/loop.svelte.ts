/**
 * Calls `step` once per animation frame while running, until it returns false or `stop()` is
 * called. Create it while a component initializes: it stops itself when the component unmounts.
 */
export class FrameLoop {
	#running = $state(false);
	#frame = 0;
	#step: () => boolean;

	constructor(step: () => boolean) {
		this.#step = step;
		$effect(() => () => this.stop());
	}

	get running() {
		return this.#running;
	}

	start() {
		if (this.#running) return;
		this.#running = true;
		this.#frame = requestAnimationFrame(this.#tick);
	}

	stop() {
		this.#running = false;
		cancelAnimationFrame(this.#frame);
	}

	toggle() {
		if (this.#running) this.stop();
		else this.start();
	}

	#tick = () => {
		if (!this.#step()) this.#running = false;
		if (this.#running) this.#frame = requestAnimationFrame(this.#tick);
	};
}
