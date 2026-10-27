/** Small runtime checks for untrusted JSON that also give it a static type. */

export type Check<T> = (value: unknown, path: string) => T;
export type Infer<C> = C extends Check<infer T> ? T : never;

export class DataError extends Error {
	constructor(path: string, expected: string) {
		super(`${path || 'data'}: expected ${expected}`);
	}
}

export const number: Check<number> = (v, path) => {
	if (typeof v !== 'number' || !Number.isFinite(v)) throw new DataError(path, 'a number');
	return v;
};

export const integer: Check<number> = (v, path) => {
	if (!Number.isInteger(v)) throw new DataError(path, 'an integer');
	return v as number;
};

export const string: Check<string> = (v, path) => {
	if (typeof v !== 'string') throw new DataError(path, 'a string');
	return v;
};

export const boolean: Check<boolean> = (v, path) => {
	if (typeof v !== 'boolean') throw new DataError(path, 'true or false');
	return v;
};

export function literal<const T extends string | number | boolean | null>(
	...values: T[]
): Check<T> {
	return (v, path) => {
		if (!values.includes(v as T)) throw new DataError(path, values.map(String).join(' or '));
		return v as T;
	};
}

export function nullable<T>(check: Check<T>): Check<T | null> {
	return (v, path) => (v === null ? null : check(v, path));
}

export function array<T>(check: Check<T>): Check<T[]> {
	return (v, path) => {
		if (!Array.isArray(v)) throw new DataError(path, 'a list');
		return v.map((item, i) => check(item, `${path}[${i}]`));
	};
}

export function tuple<const T extends unknown[]>(
	...checks: { [K in keyof T]: Check<T[K]> }
): Check<T> {
	return (v, path) => {
		if (!Array.isArray(v) || v.length !== checks.length) {
			throw new DataError(path, `a list of ${checks.length}`);
		}
		return checks.map((check, i) => check(v[i], `${path}[${i}]`)) as T;
	};
}

/** Marks an object field that may be missing. */
export interface Optional<T> {
	optional: Check<T>;
}

export function optional<T>(check: Check<T>): Optional<T> {
	return { optional: check };
}

type Shape = Record<string, Check<unknown> | Optional<unknown>>;
type Required<S extends Shape> = {
	[K in keyof S as S[K] extends Optional<unknown> ? never : K]: S[K] extends Check<infer T>
		? T
		: never;
};
type Maybe<S extends Shape> = {
	[K in keyof S as S[K] extends Optional<unknown> ? K : never]?: S[K] extends Optional<infer T>
		? T
		: never;
};
type Flat<T> = { [K in keyof T]: T[K] } & {};

/** An object with these fields. Fields not listed are dropped. */
export function object<S extends Shape>(shape: S): Check<Flat<Required<S> & Maybe<S>>> {
	return (v, path) => {
		if (typeof v !== 'object' || v === null || Array.isArray(v)) {
			throw new DataError(path, 'an object');
		}
		const source = v as Record<string, unknown>;
		const out: Record<string, unknown> = {};
		for (const [key, check] of Object.entries(shape)) {
			const at = path ? `${path}.${key}` : key;
			if (typeof check === 'function') {
				out[key] = check(source[key], at);
			} else if (source[key] !== undefined) {
				out[key] = check.optional(source[key], at);
			}
		}
		return out as Flat<Required<S> & Maybe<S>>;
	};
}

/** An object whose keys are all listed in `keys`, each holding the same kind of value. */
export function record<const K extends string, T>(
	keys: readonly K[],
	check: Check<T>
): Check<Record<K, T>> {
	return (v, path) => {
		if (typeof v !== 'object' || v === null) throw new DataError(path, 'an object');
		const source = v as Record<string, unknown>;
		return Object.fromEntries(keys.map((k) => [k, check(source[k], `${path}.${k}`)])) as Record<
			K,
			T
		>;
	};
}

/** An object with any keys, each holding the same kind of value. */
export function dictionary<T>(check: Check<T>): Check<Record<string, T>> {
	return (v, path) => {
		if (typeof v !== 'object' || v === null || Array.isArray(v)) {
			throw new DataError(path, 'an object');
		}
		return Object.fromEntries(
			Object.entries(v).map(([k, item]) => [k, check(item, `${path}.${k}`)])
		);
	};
}

/** A further check on a value that already has the right shape. */
export function refine<T>(check: Check<T>, test: (value: T, path: string) => void): Check<T> {
	return (v, path) => {
		const value = check(v, path);
		test(value, path);
		return value;
	};
}

/** Adds what code can work out from a checked value, such as a verdict on a recorded reply. */
export function derive<T, U>(check: Check<T>, add: (value: T, path: string) => U): Check<U> {
	return (v, path) => add(check(v, path), path);
}
