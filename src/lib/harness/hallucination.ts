/** A small chat model asked each question many times (scripts/record/hallucination.py). */
export interface HallucinationSamples {
	version: 1;
	model: { id: string; displayName: string; revision: string | null };
	settings: Record<string, number>;
	seed: number;
	prompts: { id: PromptId; system: string }[];
	questions: SampledQuestion[];
	generatedAt: string;
}

export type PromptId = 'plain' | 'allowed';
export type QuestionKind = 'known' | 'obscure' | 'invented';
export type Verdict = 'right' | 'wrong' | 'declined';

export interface SampledAnswer {
	text: string;
	/** Graded by code against the accepted answers; invented questions accept none. */
	verdict: Verdict;
}

export interface SampledQuestion {
	id: string;
	kind: QuestionKind;
	question: string;
	accepted: string[];
	/** The right answer to show, or null for a question about something invented. */
	truth: string | null;
	answers: Record<PromptId, SampledAnswer[]>;
	/** The answer with sampling off (temperature 0): the likeliest token at every step. */
	greedy: Record<PromptId, SampledAnswer>;
}

/** The harness trusts an answer when at least this many of the samples say the same thing. */
export const AGREE = 8;

export interface AnswerGroup {
	/** The first wording seen, or "I don't know" for every way of declining. */
	text: string;
	count: number;
	verdict: Verdict;
}

/** Answers that read the same once case, spacing, and a final period are ignored. */
const key = (a: SampledAnswer) =>
	a.verdict === 'declined'
		? 'declined'
		: a.text
				.toLowerCase()
				.replace(/[.\s]+$/, '')
				.replace(/\s+/g, ' ');

/** Same answers together, most common first. */
export function groupAnswers(answers: readonly SampledAnswer[]): AnswerGroup[] {
	const groups = new Map<string, AnswerGroup>();
	for (const a of answers) {
		const k = key(a);
		const g = groups.get(k);
		if (g) g.count++;
		else
			groups.set(k, {
				text: a.verdict === 'declined' ? 'I don’t know' : a.text,
				count: 1,
				verdict: a.verdict
			});
	}
	return [...groups.values()].sort((a, b) => b.count - a.count);
}

export type Outcome = 'trusted' | 'flagged' | 'declined';

export interface Check {
	/** The most common answer, the one the harness would pass on. */
	top: AnswerGroup;
	outcome: Outcome;
}

/** The consistency check: flag a question when fewer than AGREE samples give the top answer. */
export function consistencyCheck(answers: readonly SampledAnswer[]): Check {
	const top = groupAnswers(answers)[0];
	if (top.verdict === 'declined') return { top, outcome: 'declined' };
	return { top, outcome: top.count >= AGREE ? 'trusted' : 'flagged' };
}

export interface CheckSummary {
	right: number;
	wrong: number;
	declined: number;
	/** Wrong top answers the check flags, and right ones it flags by mistake. */
	wrongFlagged: number;
	rightFlagged: number;
}

/** Run the check on every question's samples under one system prompt. */
export function summarize(questions: readonly SampledQuestion[], prompt: PromptId): CheckSummary {
	const s = { right: 0, wrong: 0, declined: 0, wrongFlagged: 0, rightFlagged: 0 };
	for (const q of questions) {
		const { top, outcome } = consistencyCheck(q.answers[prompt]);
		s[top.verdict]++;
		if (outcome === 'flagged' && top.verdict === 'wrong') s.wrongFlagged++;
		if (outcome === 'flagged' && top.verdict === 'right') s.rightFlagged++;
	}
	return s;
}

/** Entropy in nats of the share of samples in each group: 0 when all agree. */
export function answerEntropy(answers: readonly SampledAnswer[]): number {
	const n = answers.length;
	return groupAnswers(answers).reduce((h, g) => h - (g.count / n) * Math.log(g.count / n), 0);
}
