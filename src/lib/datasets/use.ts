import { getContext, setContext } from 'svelte';
import { loadDataset } from './load.ts';
import type { DataOf, DatasetId } from './registry.ts';

export type MaybePromise<T> = T | Promise<T>;
type Preloaded = Partial<Record<DatasetId, unknown>>;

const KEY = Symbol('datasets');

/** Make the datasets a chapter's route loaded available to its widgets. */
export function provideDatasets(current: () => Preloaded): void {
	setContext(KEY, current);
}

/** Datasets for this page: preloaded ones synchronously, others fetched in the browser. */
export function useDatasets(): <I extends DatasetId>(id: I) => MaybePromise<DataOf<I>> {
	const current = getContext<(() => Preloaded) | undefined>(KEY);
	return (id) => {
		const preloaded = current?.()[id];
		return preloaded === undefined ? loadDataset(id) : (preloaded as DataOf<typeof id>);
	};
}

/** One dataset, looked up when the component starts. */
export function useDataset<I extends DatasetId>(id: I): MaybePromise<DataOf<I>> {
	return useDatasets()(id);
}

function isPromise<T>(value: MaybePromise<T>): value is Promise<T> {
	return typeof (value as Promise<T> | undefined)?.then === 'function';
}

/** Like `Promise.all`, but stays synchronous when every value is already here. */
export function all<const T extends readonly unknown[]>(values: {
	[K in keyof T]: MaybePromise<T[K]>;
}): MaybePromise<T> {
	return values.some(isPromise) ? (Promise.all(values) as Promise<T>) : (values as unknown as T);
}

/** Like `promise.then`, but stays synchronous when the value is already here. */
export function then<T, U>(value: MaybePromise<T>, fn: (value: T) => U): MaybePromise<U> {
	return isPromise(value) ? value.then(fn) : fn(value);
}
