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

/** Where the calibration widget splits confidence into bands. */
export const BANDS = [0, 0.4, 0.6, 0.8, 1] as const;

export interface Band {
	from: number;
	to: number;
	answers: number;
	/** Mean confidence of the band's answers, or null when it has none. */
	confidence: number | null;
	right: number;
}

/**
 * Group one model's answers by confidence and count how many in each band were right. A
 * calibrated model's right share matches its mean confidence in every band. The last band
 * includes its upper edge.
 */
export function calibration(
	rec: RoutingRecording,
	model: 'small' | 'big',
	edges: readonly number[] = BANDS
): Band[] {
	return edges.slice(0, -1).map((from, i) => {
		const to = edges[i + 1];
		const last = i === edges.length - 2;
		const answers = rec.questions
			.map((q) => q[model])
			.filter((a) => a.confidence >= from && (last ? a.confidence <= to : a.confidence < to));
		const sum = answers.reduce((s, a) => s + a.confidence, 0);
		return {
			from,
			to,
			answers: answers.length,
			confidence: answers.length ? sum / answers.length : null,
			right: answers.filter((a) => a.correct).length
		};
	});
}

/** Expected calibration error: each band's gap between share right and mean confidence, weighted by its share of the answers. */
export function calibrationError(bands: readonly Band[]): number {
	const n = bands.reduce((s, b) => s + b.answers, 0);
	return bands.reduce(
		(s, b) => (b.answers ? s + (b.answers / n) * Math.abs(b.right / b.answers - b.confidence!) : s),
		0
	);
}
