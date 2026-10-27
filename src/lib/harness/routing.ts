/** A small and a bigger model answering the same questions (scripts/record/routing.py). */
export interface RoutingRecording {
	version: 1;
	system: string;
	small: RoutingModel;
	big: RoutingModel;
	questions: RoutingQuestion[];
}

export interface RoutingModel {
	id: string;
	displayName: string;
	revision: string | null;
	parameters: number;
}

export interface RoutingAnswer {
	answer: string;
	tokens: number;
	/** Geometric mean of the probabilities the model gave its own answer tokens. */
	confidence: number;
	correct: boolean;
}

export interface RoutingQuestion {
	question: string;
	accepted: string[];
	small: RoutingAnswer;
	big: RoutingAnswer;
}

export interface CascadeResult {
	/** Questions passed on to the big model. */
	escalated: number;
	right: number;
	/** Cost against asking the big model everything, with a call priced by the model's weights. */
	cost: number;
}

/**
 * Ask the small model first and pass a question on to the big model when the small model's
 * confidence is below `threshold`. Every question pays for the small call; passed-on ones pay
 * for the big call too.
 */
export function cascade(rec: RoutingRecording, threshold: number): CascadeResult {
	const ratio = rec.big.parameters / rec.small.parameters;
	let escalated = 0;
	let right = 0;
	for (const q of rec.questions) {
		const pass = q.small.confidence < threshold;
		if (pass) escalated++;
		if ((pass ? q.big : q.small).correct) right++;
	}
	const n = rec.questions.length;
	return { escalated, right, cost: (n + escalated * ratio) / (n * ratio) };
}
