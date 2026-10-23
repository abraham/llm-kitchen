import { type Check, integer, nullable, number, object, string } from '../check.ts';

export const token = object({ id: integer, text: string });

export const candidate = object({ token, prob: number });

/** A model as recorded with a run: its Hugging Face id, display name, and pinned revision. */
export const modelRef = object({ id: string, displayName: string, revision: nullable(string) });

/** A token's text, id, and probability, as the prompt recordings store them. */
export const guess = object({ text: string, id: integer, p: number });

/** Any JSON value, kept as it is (for parts no widget reads, such as tool parameter schemas). */
export const json: Check<unknown> = (v) => v;
