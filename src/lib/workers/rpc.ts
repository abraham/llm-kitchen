/** A message a request-reply worker sends back, tagged with the id of the request it answers. */
export type Reply = { id: number; type: string };

type WithoutId<T> = T extends unknown ? Omit<T, 'id'> : never;
type Progress<R extends Reply> = Extract<R, { type: 'progress' }>;
/** The reply that settles a request: anything but progress or an error. */
export type Answer<R extends Reply> = Exclude<R, { type: 'progress' } | { type: 'error' }>;

type Pending<R extends Reply> = {
	resolve: (reply: Answer<R>) => void;
	reject: (error: Error) => void;
	onprogress?: (reply: Progress<R>) => void;
};

/**
 * A client for a worker that answers numbered requests. The worker starts on the first request;
 * if it fails, every waiting request is rejected and the next request starts a new one.
 */
export function rpc<Request extends { id: number }, Response extends Reply>(
	create: () => Promise<Worker>
) {
	let worker: Promise<Worker> | undefined;
	let nextId = 1;
	const pending = new Map<number, Pending<Response>>();

	function fail(failed: Promise<Worker>, error: Error) {
		if (worker !== failed) return;
		worker = undefined;
		failed.then(
			(w) => w.terminate(),
			() => {}
		);
		for (const p of pending.values()) p.reject(error);
		pending.clear();
	}

	function start(): Promise<Worker> {
		const started: Promise<Worker> = create().then((w) => {
			w.onmessage = ({ data }: MessageEvent<Response>) => {
				const p = pending.get(data.id);
				if (!p) return;
				if (data.type === 'progress') return p.onprogress?.(data as Progress<Response>);
				pending.delete(data.id);
				if (data.type === 'error') p.reject(new Error((data as { message?: string }).message));
				else p.resolve(data as Answer<Response>);
			};
			w.onerror = (event) => {
				event.preventDefault();
				fail(started, new Error(event.message || 'The worker stopped.'));
			};
			return w;
		});
		started.catch((error: unknown) =>
			fail(started, error instanceof Error ? error : new Error(String(error)))
		);
		return started;
	}

	return function request(
		body: WithoutId<Request>,
		onprogress?: (reply: Progress<Response>) => void
	): Promise<Answer<Response>> {
		worker ??= start();
		const id = nextId++;
		const current = worker;
		return new Promise((resolve, reject) => {
			pending.set(id, { resolve, reject, onprogress });
			current.then(
				(w) => w.postMessage({ ...body, id }),
				() => {}
			);
		});
	};
}
