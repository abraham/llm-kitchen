import type { Slug } from '#lib/curriculum/index.ts';

export type QuestionId = 'likely' | 'known' | 'checkable' | 'tool';
export type Answers = Record<QuestionId, boolean>;

export interface Question {
	id: QuestionId;
	text: string;
	/** The answer that suits a language model. */
	fits: boolean;
	/** Shown when the answer doesn't suit a model: the problem, a recorded example, and what to do. */
	concern: string;
	evidence: string;
	instead: string;
	chapters: Slug[];
}

/** The four questions, each backed by a recording from an earlier chapter (checked by facts.test.ts). */
export const QUESTIONS: Question[] = [
	{
		id: 'likely',
		text: 'Would a likely-sounding answer be a good one?',
		fits: true,
		concern: 'An exact answer isn’t always the likely one.',
		evidence:
			'Without a calculator, Qwen2.5-1.5B-Instruct worked out 1234 × 5678 step by step and got 7,050,952. The answer is 7,006,652.',
		instead: 'Give it a calculator or another tool, or do the exact part in code.',
		chapters: ['quirks-and-limits', 'tools']
	},
	{
		id: 'known',
		text: 'Can you give it everything it needs to know?',
		fits: true,
		concern: 'It knows only its prompt and what training left in its weights.',
		evidence:
			'Asked ten times who wrote The Lanterns of Velmora, a novel made up for this site, the same model named nine different authors.',
		instead: 'Paste in the facts, or have the harness search for them first.',
		chapters: ['making-things-up', 'search-and-memory']
	},
	{
		id: 'checkable',
		text: 'Can you check the result quickly, and live with a mistake?',
		fits: true,
		concern: 'It sounds just as sure when it’s wrong.',
		evidence:
			'Asked ten times who won the 1987 Tour de France, it said Eddy Merckx every time. It was Stephen Roche.',
		instead: 'Have someone who knows check it, and test the setup before you rely on it.',
		chapters: ['making-things-up', 'testing-agents']
	},
	{
		id: 'tool',
		text: 'Is there a simpler tool that gives the exact answer?',
		fits: false,
		concern: 'A formula, a query, or a search is exact, fast, and free.',
		evidence:
			'Even the short call in From message to reply had the model read a 400-token prompt. Ten thousand such calls is four million tokens; a spreadsheet formula gives the same answer every time.',
		instead: 'Use the simpler tool. A model can help you write the formula or the query.',
		chapters: ['end-to-end', 'tools']
	}
];

export interface Task {
	id: string;
	label: string;
	answers: Answers;
}

const task = (id: string, label: string, [likely, known, checkable, tool]: boolean[]): Task => ({
	id,
	label,
	answers: { likely, known, checkable, tool }
});

export const TASKS: Task[] = [
	task('friendlier', 'Make an email I wrote sound friendlier', [true, true, true, false]),
	task('names', 'Brainstorm names for a bake sale', [true, true, true, false]),
	task('meeting', 'Say what our team decided last week', [true, false, true, false]),
	task('report', 'Summarize a long report I haven’t read', [true, true, false, false]),
	task('contract', 'Write a clause for a contract', [true, true, false, false]),
	task('multiply', 'Multiply 1234 by 5678', [false, true, true, true]),
	task('column', 'Add up 10,000 sales figures', [false, true, true, true]),
	task('novel', 'Find who wrote a novel I half remember', [false, false, true, true])
];

/** The questions whose answers don't suit a model on its own. */
export function concerns(answers: Answers): Question[] {
	return QUESTIONS.filter((q) => answers[q.id] !== q.fits);
}

export function verdict(answers: Answers): string {
	const found = concerns(answers);
	if (!found.length) return 'A good job for a model. Read the result before you use it.';
	if (answers.tool) return 'Reach for the simpler tool first.';
	if (found.length === 1) return 'A model can help, with the fix below.';
	return 'Not a job for a model on its own. See the fixes below.';
}
