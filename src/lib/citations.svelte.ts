import { getContext, setContext } from 'svelte';
import references from './references.json';

export interface Reference {
	id: string;
	authors: string[];
	title: string;
	venue: string;
	year: number;
	url: string;
}

export const REFERENCES: readonly Reference[] = references;

export function findReference(id: string): Reference {
	const ref = REFERENCES.find((r) => r.id === id);
	if (!ref) throw new Error(`Unknown citation id "${id}"`);
	return ref;
}

export function formatAuthors(authors: string[]): string {
	if (authors.length <= 2) return authors.join(' and ');
	return `${authors[0]} et al.`;
}

/** Numbers citations in order of first use within one chapter. */
export class Citations {
	ids = $state<string[]>([]);

	number(id: string): number {
		findReference(id);
		let i = this.ids.indexOf(id);
		if (i === -1) {
			this.ids.push(id);
			i = this.ids.length - 1;
		}
		return i + 1;
	}
}

const KEY = Symbol('citations');

export function setCitations(citations: Citations) {
	setContext(KEY, citations);
}

export function getCitations(): Citations | undefined {
	return getContext<Citations | undefined>(KEY);
}
