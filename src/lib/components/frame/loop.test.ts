import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FrameLoop } from './loop.svelte.ts';

let queued: FrameRequestCallback[] = [];
const runFrame = () => {
	const callbacks = queued;
	queued = [];
	for (const cb of callbacks) cb(0);
};

beforeEach(() => {
	queued = [];
	vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => queued.push(cb));
	vi.stubGlobal('cancelAnimationFrame', () => (queued = []));
});
afterEach(() => vi.unstubAllGlobals());

describe('FrameLoop', () => {
	it('steps once per frame until the step returns false', () => {
		let n = 0;
		const loop = new FrameLoop(() => ++n < 3);
		loop.start();
		expect(loop.running).toBe(true);
		runFrame();
		runFrame();
		expect(loop.running).toBe(true);
		runFrame();
		expect(n).toBe(3);
		expect(loop.running).toBe(false);
		expect(queued).toHaveLength(0);
	});

	it('pauses and resumes with toggle', () => {
		let n = 0;
		const loop = new FrameLoop(() => (n++, true));
		loop.toggle();
		runFrame();
		loop.toggle();
		expect(loop.running).toBe(false);
		runFrame();
		expect(n).toBe(1);
		loop.toggle();
		runFrame();
		expect(n).toBe(2);
	});

	it('ignores start while running and stop while stopped', () => {
		let n = 0;
		const loop = new FrameLoop(() => (n++, true));
		loop.stop();
		loop.start();
		loop.start();
		expect(queued).toHaveLength(1);
		runFrame();
		expect(n).toBe(1);
	});
});
