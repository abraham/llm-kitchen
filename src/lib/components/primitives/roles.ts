/**
 * Who wrote each part of the text a model reads, and the one color each part gets in every chapter.
 * Roles aren't concepts in docs/spec/design.md; each is also named in text or set off by a chat
 * marker, so color is never the only cue.
 */
export type Role =
	| 'marker'
	| 'system'
	| 'tools'
	| 'history'
	| 'user'
	| 'message'
	| 'assistant'
	| 'call'
	| 'result'
	| 'harness'
	| 'document'
	| 'attack';

const ink = (concept: string) => `var(--c-${concept}-ink)`;
const tinted = (concept: string, color = ink(concept)) => ({
	color,
	background: `var(--c-${concept}-tint)`,
	edge: `var(--c-${concept})`
});

const ROLES: Record<Role, { color: string; background?: string; edge?: string; italic?: boolean }> =
	{
		marker: tinted('token'),
		system: tinted('harness'),
		tools: { color: ink('harness'), italic: true },
		harness: { color: ink('harness') },
		history: { color: 'var(--ink-muted)' },
		user: { color: ink('prob') },
		message: { color: ink('prob') },
		assistant: { color: ink('vector') },
		call: { color: ink('harness') },
		// Text from outside the conversation that the harness pastes in.
		result: tinted('vector', 'var(--ink)'),
		document: tinted('vector', 'var(--ink)'),
		attack: tinted('loss')
	};

/** Inline style for text written by `role`. */
export function roleStyle(role: Role): string {
	const { color, background, italic } = ROLES[role];
	return [
		`color: ${color}`,
		background && `background: ${background}`,
		italic && 'font-style: italic'
	]
		.filter(Boolean)
		.join('; ');
}

/** Inline style for a legend swatch for `role`: its tint outlined in its concept color, or its ink. */
export function roleSwatch(role: Role): string {
	const { color, background, edge } = ROLES[role];
	return background
		? `background: ${background}; box-shadow: inset 0 0 0 1px ${edge}`
		: `background: ${color}`;
}
