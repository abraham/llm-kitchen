export type PromptDiffKind = 'same' | 'removed' | 'added';

/** One piece of a prompt-layout diff, keeping words and delimiters readable. */
export interface PromptDiffChunk {
	kind: PromptDiffKind;
	text: string;
	display: string;
}

function splitPieces(text: string): string[] {
	return text.match(/[A-Za-z0-9']+|\n|[ \t]+|./g) ?? [];
}

function showPiece(text: string): string {
	return text.replaceAll('\n', '↵').replaceAll('\t', '⇥');
}

/** Word/delimiter LCS diff between two prompt layouts, merging adjacent chunks of the same kind. */
export function diffPromptLayouts(before: string, after: string): PromptDiffChunk[] {
	const a = splitPieces(before);
	const b = splitPieces(after);
	const m = a.length;
	const n = b.length;
	const dp: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
	for (let i = m - 1; i >= 0; i--) {
		for (let j = n - 1; j >= 0; j--) {
			dp[i][j] = a[i] === b[j] ? 1 + dp[i + 1][j + 1] : Math.max(dp[i + 1][j], dp[i][j + 1]);
		}
	}

	const raw: { kind: PromptDiffKind; text: string }[] = [];
	let i = 0;
	let j = 0;
	while (i < m && j < n) {
		if (a[i] === b[j]) {
			raw.push({ kind: 'same', text: a[i] });
			i++;
			j++;
		} else if (dp[i + 1][j] >= dp[i][j + 1]) {
			raw.push({ kind: 'removed', text: a[i] });
			i++;
		} else {
			raw.push({ kind: 'added', text: b[j] });
			j++;
		}
	}
	while (i < m) raw.push({ kind: 'removed', text: a[i++] });
	while (j < n) raw.push({ kind: 'added', text: b[j++] });

	// Merge adjacent pieces with the same diff kind so wrapper labels read naturally.
	const merged: PromptDiffChunk[] = [];
	for (const item of raw) {
		const prev = merged.at(-1);
		if (prev && prev.kind === item.kind) {
			prev.text += item.text;
			prev.display = showPiece(prev.text);
		} else {
			merged.push({ kind: item.kind, text: item.text, display: showPiece(item.text) });
		}
	}
	return merged;
}

/** Plain-English explanation of one piece in a prompt-layout diff. */
export function describePromptDiffChunk(
	chunk: PromptDiffChunk,
	baseName: string,
	otherName: string,
	baseScore: number,
	otherScore: number,
	total: number
): string {
	const shown = chunk.display.trim() ? `“${chunk.display}”` : 'whitespace';
	const delta = `${baseScore} of ${total} → ${otherScore} of ${total}`;
	if (chunk.kind === 'same') {
		return `Unchanged content (${shown}): the review and label stay identical while the score moves ${delta}.`;
	}
	if (chunk.kind === 'removed') {
		return `Removed wrapper (${shown}) from “${baseName}”: replaced when switching to “${otherName}” (${delta}).`;
	}
	return `Added wrapper (${shown}) in “${otherName}”: only the layout punctuation/labels changed (${delta}).`;
}
