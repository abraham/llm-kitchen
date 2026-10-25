/** A map from data values to positions on screen, and back. */
export interface Scale {
	(value: number): number;
	readonly domain: readonly [number, number];
	readonly range: readonly [number, number];
	invert(position: number): number;
	/** About `count` round values inside the domain, for ticks and gridlines. */
	ticks(count?: number): number[];
}

/** Round steps of 1, 2, or 5 times a power of ten, about `count` of them, from `min` to `max`. */
export function niceTicks(min: number, max: number, count = 5): number[] {
	if (!(max > min) || count < 1) return Number.isFinite(min) ? [min] : [];
	const raw = (max - min) / count;
	const power = 10 ** Math.floor(Math.log10(raw));
	const error = raw / power;
	// The multiple of the power nearest to the raw step (the thresholds are geometric midpoints).
	const step =
		power *
		(error >= Math.sqrt(50) ? 10 : error >= Math.sqrt(10) ? 5 : error >= Math.SQRT2 ? 2 : 1);
	const out: number[] = [];
	for (let i = Math.ceil(min / step - 1e-9); i * step <= max + step * 1e-9; i++) {
		out.push(Number((i * step).toPrecision(12)));
	}
	return out;
}

function build(
	domain: readonly [number, number],
	range: readonly [number, number],
	forward: (v: number) => number,
	backward: (t: number) => number,
	ticks: (count: number) => number[]
): Scale {
	const [t0, t1] = [forward(domain[0]), forward(domain[1])];
	const [r0, r1] = range;
	const scale = ((value: number) => r0 + ((forward(value) - t0) / (t1 - t0)) * (r1 - r0)) as Scale;
	return Object.assign(scale, {
		domain,
		range,
		invert: (position: number) => backward(t0 + ((position - r0) / (r1 - r0)) * (t1 - t0)),
		ticks: (count = 5) => ticks(count)
	});
}

/** Values spaced evenly. */
export function scaleLinear(domain: readonly [number, number], range: readonly [number, number]) {
	const [lo, hi] = [Math.min(...domain), Math.max(...domain)];
	return build(
		domain,
		range,
		(v) => v,
		(t) => t,
		(count) => niceTicks(lo, hi, count)
	);
}

/** Powers of ten spaced evenly; ticks are powers of ten, thinned to about `count`. */
export function scaleLog(domain: readonly [number, number], range: readonly [number, number]) {
	if (domain[0] <= 0 || domain[1] <= 0) throw new Error('A log scale needs a positive domain');
	const [lo, hi] = [Math.min(...domain), Math.max(...domain)].map(Math.log10);
	return build(
		domain,
		range,
		Math.log10,
		(t) => 10 ** t,
		(count) => {
			const first = Math.ceil(lo - 1e-9);
			const last = Math.floor(hi + 1e-9);
			const every = Math.max(1, Math.ceil((last - first + 1) / Math.max(count, 1)));
			const out: number[] = [];
			for (let e = first; e <= last; e += every) out.push(10 ** e);
			return out;
		}
	);
}
