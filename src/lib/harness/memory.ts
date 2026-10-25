import type { AgentRun } from './agent.ts';

/** Notes kept between chats (scripts/record/memory.py). */
export interface MemoryRecording {
	model: AgentRun['model'];
	system: string;
	notesHeader: string;
	/** The whole earlier chat, as a prompt. */
	chatTokens: number;
	without: MemoryAnswer[];
	notes: Record<NotesKind, MemoryNotes>;
}

export type NotesKind = 'general' | 'specific';

export interface MemoryNotes {
	/** What the harness asked the model to write down. */
	request: string;
	notes: string;
	tokens: number;
	answers: MemoryAnswer[];
}

export interface MemoryAnswer {
	question: string;
	/** The fresh chat's whole prompt. */
	tokens: number;
	answer: string;
}

/** What the earlier chat said, for each question asked in the fresh chat. */
export const MEMORY_FACTS: Record<string, string> = {
	'Which child in my class loves the rhyme about the cat?': 'Lily',
	'Which rhyme does Omar love?': 'Mary had a little lamb',
	'Which rhyme does Sam love?': 'Humpty Dumpty'
};

/** Does the answer give what the earlier chat said? */
export function remembered(a: MemoryAnswer): boolean {
	const fact = MEMORY_FACTS[a.question];
	return fact !== undefined && a.answer.toLowerCase().includes(fact.toLowerCase());
}
