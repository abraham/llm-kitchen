import { createRawSnippet } from 'svelte';
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import ScrollBox from './ScrollBox.svelte';
import Status from './Status.svelte';

const text = (s: string) => createRawSnippet(() => ({ render: () => `<span>${s}</span>` }));

describe('ScrollBox', () => {
	it('is a named region, focusable only once the page hydrates', () => {
		const { body } = render(ScrollBox, {
			props: { label: 'The reply', maxHeight: '16rem', children: text('Hello') }
		});
		expect(body).toMatch(/<div[^>]* role="region"[^>]* aria-label="The reply"/);
		expect(body).toContain('max-height: 16rem');
		expect(body).toContain('<span>Hello</span>');
		expect(body).not.toContain('tabindex');
	});
});

describe('Status', () => {
	it('renders its live region even when empty', () => {
		const { body } = render(Status, { props: {} });
		expect(body).toMatch(/<p[^>]* role="status"[^>]*>(<!--[^>]*-->)*<\/p>/);
	});

	it('reserves the lines it is asked for', () => {
		const { body } = render(Status, { props: { lines: 3, children: text('Done') } });
		expect(body).toContain('--lines: 3');
		expect(body).toContain('<span>Done</span>');
	});
});
