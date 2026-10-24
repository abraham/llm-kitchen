import { getContext, setContext } from 'svelte';

/** How much a chapter explains; see docs/spec/levels.md. */
export type Level = 'simple' | 'standard' | 'deep';

/** The levels other than Standard, which a chapter adds passages for. */
export type ExtraLevel = Exclude<Level, 'standard'>;

export const LEVELS: readonly Level[] = ['simple', 'standard', 'deep'];

export const LEVEL_NAMES: Record<Level, string> = {
	simple: 'Simple',
	standard: 'Standard',
	deep: 'In depth'
};

/** A saved level, or null for Standard and anything else in storage. */
export function parseLevel(raw: string | null | undefined): ExtraLevel | null {
	return raw === 'simple' || raw === 'deep' ? raw : null;
}

/** The levels in a `levels="…"` attribute, in reading order; throws on an empty or unknown list. */
export function parseLevels(raw: string): Level[] {
	const words = raw.split(/\s+/).filter(Boolean);
	const unknown = words.filter((w) => !(LEVELS as readonly string[]).includes(w));
	if (words.length === 0 || unknown.length > 0) {
		throw new Error(`levels="${raw}" needs one or more of ${LEVELS.join(', ')}`);
	}
	return LEVELS.filter((l) => words.includes(l));
}

/** A `data-levels` value for content shown at `levels`; none when it shows at every level. */
export function levelsAttribute(levels: readonly Level[] | undefined): string | undefined {
	return levels && levels.length < LEVELS.length ? levels.join(' ') : undefined;
}

/**
 * The levels that read differently from Standard, given the levels each passage shows at: a
 * passage shows at the level but not at Standard, or the other way round.
 */
export function differingLevels(passages: readonly (readonly Level[])[]): ExtraLevel[] {
	return (['simple', 'deep'] as const).filter((level) =>
		passages.some((p) => p.includes(level) !== p.includes('standard'))
	);
}

/** Standard's value and any per-level variants, grouped by the levels that show the same one. */
export function byLevel<T>(
	standard: T,
	variants: Partial<Record<ExtraLevel, T>>
): { levels: Level[]; value: T }[] {
	const groups: { levels: Level[]; value: T }[] = [];
	for (const level of LEVELS) {
		const value = (level !== 'standard' && variants[level]) || standard;
		const group = groups.find((g) => g.value === value);
		if (group) group.levels.push(level);
		else groups.push({ levels: [level], value });
	}
	return groups;
}

const KEY = Symbol('levels');

/** The levels the enclosing passage shows at (all of them outside a passage). */
export function getLevels(): readonly Level[] {
	return getContext<readonly Level[] | undefined>(KEY) ?? LEVELS;
}

export function setLevels(levels: readonly Level[]) {
	setContext(KEY, levels);
}
