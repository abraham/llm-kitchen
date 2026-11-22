import { hexByte } from './encoding.ts';
import type { Token } from '../models/provider.ts';

/** One token from a tokenizer, with its character count, UTF-8 bytes, and shape notes. */
export interface AnnotatedToken {
	index: number;
	id: number;
	text: string;
	chars: number;
	utf8Hex: string[];
	leadingSpace: boolean;
	whitespaceOnly: boolean;
	partialUtf8: boolean;
}

export type TokenDiffKind = 'same' | 'removed' | 'added';

export interface TokenDiffItem {
	kind: TokenDiffKind;
	token: AnnotatedToken;
	beforeIndex?: number;
}

const encoder = new TextEncoder();

/** Enrich a tokenizer's output with positions, character counts, and UTF-8 bytes. */
export function annotateTokens(tokens: readonly Token[]): AnnotatedToken[] {
	return tokens.map((t, index) => {
		const partialUtf8 = t.text.includes('\uFFFD');
		return {
			index,
			id: t.id,
			text: t.text,
			chars: [...t.text].length,
			utf8Hex: partialUtf8 ? [] : [...encoder.encode(t.text)].map(hexByte),
			leadingSpace: t.text.startsWith(' ') && t.text.length > 1,
			whitespaceOnly: t.text.length > 0 && /^\s+$/.test(t.text),
			partialUtf8
		};
	});
}

/** Longest-common-subsequence diff between two token streams, grouping removals before additions. */
export function diffTokens(
	before: readonly AnnotatedToken[],
	after: readonly AnnotatedToken[]
): TokenDiffItem[] {
	const m = before.length;
	const n = after.length;
	const dp: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
	for (let i = m - 1; i >= 0; i--) {
		for (let j = n - 1; j >= 0; j--) {
			dp[i][j] =
				before[i].id === after[j].id ? 1 + dp[i + 1][j + 1] : Math.max(dp[i + 1][j], dp[i][j + 1]);
		}
	}

	const items: TokenDiffItem[] = [];
	let i = 0;
	let j = 0;
	while (i < m && j < n) {
		if (before[i].id === after[j].id) {
			items.push({ kind: 'same', token: after[j], beforeIndex: before[i].index });
			i++;
			j++;
		} else if (dp[i + 1][j] >= dp[i][j + 1]) {
			items.push({ kind: 'removed', token: before[i] });
			i++;
		} else {
			items.push({ kind: 'added', token: after[j] });
			j++;
		}
	}
	while (i < m) items.push({ kind: 'removed', token: before[i++] });
	while (j < n) items.push({ kind: 'added', token: after[j++] });
	return items;
}

export function tokenKindLabel(token: AnnotatedToken): string {
	if (token.partialUtf8) return 'Split UTF-8 bytes';
	if (token.whitespaceOnly) {
		return token.chars === 1 ? '1 whitespace character' : `${token.chars} whitespace characters`;
	}
	if (token.leadingSpace) return `Leading space + ${token.chars - 1} chars`;
	return token.chars === 1 ? '1 character' : `${token.chars} characters`;
}

/** Plain-English explanation of one token in the diff, used for the live status readout. */
export function describeTokenDiff(item: TokenDiffItem, tokenizerLabel: string): string {
	const { token: t, kind } = item;
	const pos = t.index + 1;
	const status =
		kind === 'removed'
			? `Removed from position ${pos}`
			: kind === 'added'
				? `Added at position ${pos}`
				: `Unchanged at position ${pos}`;

	if (t.partialUtf8) {
		return `${status}: token ${t.id} in ${tokenizerLabel}, part of a multi-byte character split across its UTF-8 bytes.`;
	}
	const spoken = t.whitespaceOnly
		? t.chars === 1
			? 'a single space'
			: `${t.chars} spaces`
		: `“${t.text}”`;
	const byteText = `${t.utf8Hex.length} UTF-8 ${t.utf8Hex.length === 1 ? 'byte' : 'bytes'}`;
	const note = t.leadingSpace ? ' The leading space belongs to this token.' : '';
	return `${status}: ${spoken} (token ${t.id} in ${tokenizerLabel}), ${byteText}.${note}`;
}
