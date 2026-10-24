import type { Component } from 'svelte';
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import type { ExtraLevel } from '#lib/levels.ts';
import FixturePage from '../../../routes/fixtures/[fixture]/+page.svelte';

const [fixture] = Object.values(
	import.meta.glob<{ default: Component; title: string; levels: ExtraLevel[] }>(
		'/tests/e2e/fixtures/levels.svx',
		{ eager: true }
	)
);

const { body } = render(FixturePage, {
	props: {
		data: { component: fixture.default, title: fixture.title, levels: fixture.levels },
		params: { fixture: 'levels' }
	}
});

/** The text of each element tagged for `levels`, in order. */
function tagged(levels: string, tag = '[a-z]+') {
	const pattern = new RegExp(
		`<(${tag})\\b[^>]*data-levels="${levels}"[^>]*>([\\s\\S]*?)</\\1>`,
		'g'
	);
	return [...body.matchAll(pattern)].map(([, , html]) =>
		html
			.replace(/<[^>]*>/g, ' ')
			.replace(/\s+/g, ' ')
			.trim()
	);
}

describe('At', () => {
	it('renders every level, each tagged with the levels it shows at', () => {
		expect(tagged('simple', 'div')).toEqual(['Simple passage: the short version. [2]']);
		expect(tagged('standard deep', 'div')[0]).toMatch(/^Standard passage: the full version\./);
		expect(tagged('deep', 'div')[0]).toMatch(/^Deep passage: the details\./);
		expect(tagged('simple', 'span')).toEqual(['plain']);
		expect(tagged('standard deep', 'span')).toEqual(['precise']);
	});
});

describe('Cite and Sources in a chapter with other levels', () => {
	it('render one number per level the citation shows at', () => {
		expect(tagged('simple', 'a')).toEqual(['[1]', '[2]', '[3]']);
		expect(tagged('standard', 'a')).toEqual(['[1]', '[2]', '[2]']);
		expect(tagged('deep', 'a')).toEqual(['[1]', '[2]', '[3]', '[2]']);
		expect(body).toContain('href="#source-deep-gpt2-model-card"');
	});

	it("render one sources list per level, holding only what it cites, under that level's anchors", () => {
		const ids = (level: string) =>
			[...(tagged(level, 'section')[0] ?? '').matchAll(/\(\d{4}\)\. (\S+)/g)].map(([, w]) => w);
		expect(ids('simple')).toEqual(['A', 'Language', 'Prediction']);
		expect(ids('standard')).toEqual(['A', 'Prediction']);
		expect(ids('deep')).toEqual(['A', 'Prediction', 'GPT-2']);
		expect(body).toContain('id="source-shannon1948"');
		expect(body).toContain('id="source-simple-radford2019"');
	});
});
