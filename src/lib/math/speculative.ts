import type { Token } from '#lib/models/provider.ts';

/** The `speculative/drafts` dataset, written by scripts/record/speculative.py. */
export interface SpeculativeRecording {
	version: 1;
	drafter: SpeculativeModel;
	target: SpeculativeModel;
	/** Tokens the drafter guesses each round. */
	draft: number;
	newTokens: number;
	runs: SpeculativeRun[];
	generatedAt: string;
}

export interface SpeculativeModel {
	id: string;
	displayName: string;
	revision: string | null;
	parameters: number;
}

export interface SpeculativeRun {
	prompt: string;
	tokens: Token[];
	/** The final text: exactly the big model's own greedy output. */
	written: Token[];
	rounds: SpeculativeRound[];
}

/** One pass of the big model: the drafter's guesses, how many it kept, and the token it added. */
export interface SpeculativeRound {
	guesses: Token[];
	kept: number;
	added: Token;
}

/** Tokens written after the first `rounds` rounds (the last round can overshoot the length). */
export function writtenAfter(run: SpeculativeRun, rounds: number): number {
	const total = run.rounds.slice(0, rounds).reduce((sum, r) => sum + r.kept + 1, 0);
	return Math.min(total, run.written.length);
}

export type RoundSlotKind = 'kept' | 'wrong' | 'dropped' | 'added';

/** One clickable token in a speculative-decoding round, tagged with the big model's verdict. */
export interface AnnotatedRoundSlot {
	index: number;
	kind: RoundSlotKind;
	token: Token;
	/** For 'wrong', the big model's replacement; for 'added', the wrong guess it replaced (if any). */
	counterpart?: Token;
}

/** Expand a round into its drafter guesses plus the target model's own token. */
export function annotateRound(round: SpeculativeRound): AnnotatedRoundSlot[] {
	const slots: AnnotatedRoundSlot[] = round.guesses.map((token, index) => ({
		index,
		kind: index < round.kept ? 'kept' : index === round.kept ? 'wrong' : 'dropped',
		token,
		counterpart: index === round.kept ? round.added : undefined
	}));
	slots.push({
		index: round.guesses.length,
		kind: 'added',
		token: round.added,
		counterpart: round.kept < round.guesses.length ? round.guesses[round.kept] : undefined
	});
	return slots;
}

/** Plain-English explanation of one token in a speculative-decoding round. */
export function describeRoundSlot(
	slot: AnnotatedRoundSlot,
	drafter: string,
	target: string,
	kept: number,
	draftCount: number
): string {
	const text = slot.token.text.replaceAll(' ', '·').replaceAll('\n', '↵');
	const num = slot.index + 1;
	if (slot.kind === 'kept') {
		return `Guess #${num} (“${text}”, token ${slot.token.id}): ${target} agreed with ${drafter}, so this token is kept without another pass.`;
	}
	if (slot.kind === 'wrong') {
		const repl = slot.counterpart!.text.replaceAll(' ', '·').replaceAll('\n', '↵');
		return `Guess #${num} (“${text}”, token ${slot.token.id}): first mismatch—${target} chose “${repl}” instead, so this guess and any after it are thrown away.`;
	}
	if (slot.kind === 'dropped') {
		return `Guess #${num} (“${text}”, token ${slot.token.id}): dropped because guess #${kept + 1} disagreed; later guesses depended on the wrong prefix.`;
	}
	if (slot.counterpart) {
		const wrong = slot.counterpart.text.replaceAll(' ', '·').replaceAll('\n', '↵');
		return `${target}'s own token (“${text}”, token ${slot.token.id}): replaces wrong guess #${kept + 1} (“${wrong}”), giving ${kept + 1} ${kept === 0 ? 'token' : 'tokens'} from this pass.`;
	}
	return `Bonus token from ${target} (“${text}”, token ${slot.token.id}): all ${draftCount} guesses matched, so the same pass yields one extra token (${draftCount + 1} in all).`;
}
