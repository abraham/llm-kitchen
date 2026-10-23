/** The Ch 28 prompt-injection lab (scripts/build-injection.py). */
export interface InjectionRun {
	doc: string;
	attack: string;
	defense: string;
	/** The exact text the model was given. */
	prompt: string;
	/** Where the document, and the attack inside it, sit in the prompt (character offsets). */
	documentSpan: [number, number];
	attackSpan: [number, number] | null;
	/** How many `<|im_start|>` role markers the model read, real or fake. */
	markerTokens: number;
	reply: string;
	/** The false claim the attack asked for made it into the summary. */
	followed: boolean;
}

export interface InjectionLab {
	model: { id: string; displayName: string; revision: string | null };
	documents: { id: string; kind: string; title: string; claim: string }[];
	attacks: { id: string; label: string }[];
	defenses: { id: string; label: string }[];
	runs: InjectionRun[];
}

export function findRun(lab: InjectionLab, doc: string, attack: string, defense: string) {
	const run = lab.runs.find((r) => r.doc === doc && r.attack === attack && r.defense === defense);
	if (!run) throw new Error(`No run for ${doc}/${attack}/${defense}`);
	return run;
}

/** How many documents an attack worked on under a defense. */
export function tally(lab: InjectionLab, attack: string, defense: string): number {
	return lab.runs.filter((r) => r.attack === attack && r.defense === defense && r.followed).length;
}

export type PromptPiece = {
	text: string;
	source: 'harness' | 'document' | 'attack';
	marker: boolean;
};

/** Split a prompt into pieces by where they came from, with chat markers as their own pieces. */
export function promptPieces(run: InjectionRun): PromptPiece[] {
	const [docStart, docEnd] = run.documentSpan;
	const [atkStart, atkEnd] = run.attackSpan ?? [docEnd, docEnd];
	const cuts = [
		{ end: docStart, source: 'harness' as const },
		{ end: atkStart, source: 'document' as const },
		{ end: atkEnd, source: 'attack' as const },
		{ end: docEnd, source: 'document' as const },
		{ end: run.prompt.length, source: 'harness' as const }
	];
	const pieces: PromptPiece[] = [];
	let pos = 0;
	for (const { end, source } of cuts) {
		const text = run.prompt.slice(pos, end);
		pos = Math.max(pos, end);
		for (const part of text.split(/(<\|im_(?:start|end)\|>)/)) {
			if (part) pieces.push({ text: part, source, marker: /^<\|im_/.test(part) });
		}
	}
	return pieces;
}
