/**
 * Verdicts on recorded replies that code can work out: one implementation, used by the dataset
 * parsers (so every widget and test gets the same answer) and by the live widgets.
 */

/** A letter, digit, or underscore: what Python's `\b` treats as part of a word. */
const WORD = '[\\p{L}\\p{N}_]';

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Whether an answer names one of the accepted answers: numbers as whole numbers, words as whole
 * words, in any case, ignoring thousands separators. */
export function matchesAccepted(answer: string, accepted: readonly string[]): boolean {
	const text = answer.toLowerCase().replaceAll(',', '');
	return accepted.some((a) => {
		const want = escape(a.toLowerCase());
		const pattern = /^\d+$/.test(a) ? `(?<!\\d)${want}(?!\\d)` : `(?<!${WORD})${want}(?!${WORD})`;
		return new RegExp(pattern, 'u').test(text);
	});
}

const DECLINE =
	/don['’]t know|do not know|not sure|unsure|no (?:information|record|data|known)|not aware|couldn['’]t find|could not find|unable to|does(?:n['’]t| not) exist|fictional|not a real|there is no|i['’]m sorry|cannot (?:find|provide|answer|determine)|not possible to/i;

export type AnswerVerdict = 'right' | 'wrong' | 'declined';

/** Right, wrong, or declined ("I don't know" and the like), for a question with these accepted
 * answers; a question about something invented accepts none. */
export function answerVerdict(answer: string, accepted: readonly string[]): AnswerVerdict {
	if (DECLINE.test(answer)) return 'declined';
	return matchesAccepted(answer, accepted) ? 'right' : 'wrong';
}

/** Every number in a reply, commas removed. */
export function numbersIn(text: string): string[] {
	return text.replaceAll(',', '').match(/-?\d[\d,]*/g) ?? [];
}

/** Whether the last number in a reply is the expected one. */
export function lastNumberIs(text: string, expected: number): boolean {
	return numbersIn(text).at(-1) === String(expected);
}

/** The number after the last "Answer:", or else the last number in the reply. */
export function finalNumber(text: string): string | null {
	const tagged = [...text.matchAll(/Answer:\s*\$?(-?\d[\d,]*)/g)].map((m) => m[1]);
	const found = tagged.length > 0 ? tagged : (text.match(/-?\d[\d,]*/g) ?? []);
	return found.at(-1)?.replaceAll(',', '') ?? null;
}

/** Whether a short reply names the right answer ("the Pacific" counts as "Pacific"). */
export function namesAnswer(reply: string, right: string): boolean {
	return reply.toLowerCase().includes(right.replace(/^the /, '').toLowerCase());
}
