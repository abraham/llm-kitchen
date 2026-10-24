import { getContext, setContext } from 'svelte';
import { LEVELS, type ExtraLevel, type Level } from './levels.ts';
import references from './references.json';

export interface Reference {
	id: string;
	authors: string[];
	title: string;
	venue: string;
	year: number;
	url: string;
	/** For pages that change over time (model cards, repos, drafts): when they were last checked. */
	accessed?: string;
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

/**
 * Numbers citations in order of first use within one chapter. A chapter with passages for other
 * levels (`levels` in its chapter.ts) numbers each level separately, since each hides some.
 */
export class Citations {
	/** Whether numbering and the sources list differ by level. */
	readonly leveled: boolean;
	/** Each level's sources, in order of first use. */
	ids = $state<Record<Level, string[]>>({ simple: [], standard: [], deep: [] });

	constructor(levels: readonly ExtraLevel[] = []) {
		this.leveled = levels.length > 0;
	}

	/** Registers a citation shown at `levels` and returns its number at each. */
	number(id: string, levels: readonly Level[] = LEVELS): { level: Level; n: number }[] {
		findReference(id);
		return levels.map((level) => {
			const ids = this.ids[level];
			if (!ids.includes(id)) ids.push(id);
			return { level, n: ids.indexOf(id) + 1 };
		});
	}
}

/** The id of a source's entry in its level's list; Standard's (the only list when unleveled) is plain. */
export function sourceAnchor(id: string, level: Level = 'standard'): string {
	return level === 'standard' ? `source-${id}` : `source-${level}-${id}`;
}

const KEY = Symbol('citations');

export function setCitations(citations: Citations) {
	setContext(KEY, citations);
}

export function getCitations(): Citations | undefined {
	return getContext<Citations | undefined>(KEY);
}
