import type { Token } from '#lib/models/provider.ts';

/** static/speculative/gpt2.json, written by scripts/build-speculative.py. */
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
