import { asset } from '$app/paths';
import { canonical } from './provider.ts';
import { parseTrace, type Trace } from './trace.ts';

const cache = new Map<string, Promise<Trace>>();

/** Fetch and validate a recorded trace from static/traces/<model-id>/<name>.json (cached). */
export function loadTrace(name: string): Promise<Trace> {
	// While prerendering, leave widgets in their loading state; the browser fetches the data.
	if (typeof window === 'undefined') return new Promise(() => {});
	let pending = cache.get(name);
	if (!pending) {
		const url = asset(`traces/${canonical.id}/${name}.json` as Parameters<typeof asset>[0]);
		pending = fetch(url)
			.then((res) => {
				if (!res.ok) throw new Error(`Could not load recorded data (${res.status})`);
				return res.json();
			})
			.then(parseTrace);
		pending.catch(() => cache.delete(name));
		cache.set(name, pending);
	}
	return pending;
}
