import { createRawSnippet } from 'svelte';
import { render } from 'svelte/server';
import { describe, expect, it, vi } from 'vitest';
import GlossaryPopover from './GlossaryPopover.svelte';

vi.mock('#lib/glossary.ts', () => ({
	GLOSSARY: {
		plain: { term: 'plain term', definition: 'The definition.', chapter: 'tokens' },
		leveled: {
			term: 'leveled term',
			definition: 'The standard definition.',
			simple: 'The simple definition.',
			chapter: 'tokens'
		}
	}
}));

const popover = (term: string) =>
	render(GlossaryPopover, {
		props: {
			term: term as never,
			children: createRawSnippet(() => ({ render: () => `<span>${term}</span>` }))
		}
	}).body;

describe('GlossaryPopover', () => {
	it('shows one definition when the term has no per-level ones', () => {
		const body = popover('plain');
		expect(body).toContain('<span>The definition.</span>');
		expect(body).not.toContain('data-levels');
	});

	it("tags each level's definition, falling back to the standard one", () => {
		const body = popover('leveled');
		expect(body).toContain('<span data-levels="simple">The simple definition.</span>');
		expect(body).toContain('<span data-levels="standard deep">The standard definition.</span>');
	});
});
