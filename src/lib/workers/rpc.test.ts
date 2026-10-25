import { describe, expect, it } from 'vitest';
import { rpc } from './rpc.ts';

type Request = { id: number; text: string };
type Response =
	| { id: number; type: 'progress'; done: number }
	| { id: number; type: 'echo'; text: string }
	| { id: number; type: 'error'; message: string };

/** Stands in for a Worker: records what the page sent and lets the test reply or crash. */
class FakeWorker {
	sent: Request[] = [];
	terminated = false;
	onmessage: ((event: { data: Response }) => void) | null = null;
	onerror: ((event: { message: string; preventDefault(): void }) => void) | null = null;
	postMessage(message: Request) {
		this.sent.push(message);
	}
	terminate() {
		this.terminated = true;
	}
	reply(data: Response) {
		this.onmessage!({ data });
	}
	crash(message: string) {
		this.onerror!({ message, preventDefault() {} });
	}
}

function setup() {
	const workers: FakeWorker[] = [];
	const request = rpc<Request, Response>(async () => {
		const w = new FakeWorker();
		workers.push(w);
		return w as unknown as Worker;
	});
	return { workers, request };
}

const tick = () => new Promise((resolve) => setTimeout(resolve));

describe('rpc', () => {
	it('starts one worker on the first request and numbers every request', async () => {
		const { workers, request } = setup();
		expect(workers).toHaveLength(0);
		void request({ text: 'a' });
		void request({ text: 'b' });
		await tick();
		expect(workers).toHaveLength(1);
		expect(workers[0].sent).toEqual([
			{ id: 1, text: 'a' },
			{ id: 2, text: 'b' }
		]);
	});

	it('settles each request with the reply that has its id, in any order', async () => {
		const { workers, request } = setup();
		const a = request({ text: 'a' });
		const b = request({ text: 'b' });
		await tick();
		workers[0].reply({ id: 2, type: 'echo', text: 'B' });
		workers[0].reply({ id: 1, type: 'echo', text: 'A' });
		expect(await a).toEqual({ id: 1, type: 'echo', text: 'A' });
		expect(await b).toEqual({ id: 2, type: 'echo', text: 'B' });
	});

	it('rejects only the request an error reply answers', async () => {
		const { workers, request } = setup();
		const a = request({ text: 'a' });
		const b = request({ text: 'b' });
		await tick();
		workers[0].reply({ id: 1, type: 'error', message: 'No such tokenizer' });
		workers[0].reply({ id: 2, type: 'echo', text: 'B' });
		await expect(a).rejects.toThrow('No such tokenizer');
		await expect(b).resolves.toMatchObject({ text: 'B' });
	});

	it('hands progress to its own request and keeps waiting for the answer', async () => {
		const { workers, request } = setup();
		const seen: number[] = [];
		const a = request({ text: 'a' }, (p) => seen.push(p.done));
		await tick();
		workers[0].reply({ id: 1, type: 'progress', done: 1 });
		workers[0].reply({ id: 1, type: 'progress', done: 2 });
		workers[0].reply({ id: 1, type: 'echo', text: 'A' });
		await expect(a).resolves.toMatchObject({ text: 'A' });
		expect(seen).toEqual([1, 2]);
	});

	it('rejects every waiting request when the worker crashes, then starts a new one', async () => {
		const { workers, request } = setup();
		const a = request({ text: 'a' });
		const b = request({ text: 'b' });
		await tick();
		workers[0].crash('Out of memory');
		await expect(a).rejects.toThrow('Out of memory');
		await expect(b).rejects.toThrow('Out of memory');
		await tick();
		expect(workers[0].terminated).toBe(true);

		const c = request({ text: 'c' });
		await tick();
		expect(workers).toHaveLength(2);
		workers[1].reply({ id: workers[1].sent[0].id, type: 'echo', text: 'C' });
		await expect(c).resolves.toMatchObject({ text: 'C' });
	});

	it('rejects a request whose worker fails to start, and tries again next time', async () => {
		let attempts = 0;
		const workers: FakeWorker[] = [];
		const request = rpc<Request, Response>(async () => {
			attempts++;
			if (attempts === 1) throw new Error('Failed to load the worker');
			const w = new FakeWorker();
			workers.push(w);
			return w as unknown as Worker;
		});
		await expect(request({ text: 'a' })).rejects.toThrow('Failed to load the worker');
		const b = request({ text: 'b' });
		await tick();
		workers[0].reply({ id: 2, type: 'echo', text: 'B' });
		await expect(b).resolves.toMatchObject({ text: 'B' });
		expect(attempts).toBe(2);
	});
});
