import type { Component } from 'svelte';
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import type { ExtraLevel } from '#lib/levels.ts';
import FixturePage from '../../../routes/fixtures/[fixture]/+page.svelte';

const fixtures = import.meta.glob<{ default: Component; title: string; levels: ExtraLevel[] }>(
	'/tests/e2e/fixtures/*.svx',
	{ eager: true }
);

/** A fixture page's server-rendered body. */
function renderFixture(name: string) {
	const fixture = fixtures[`/tests/e2e/fixtures/${name}.svx`];
	return render(FixturePage, {
		props: {
			data: { component: fixture.default, title: fixture.title, levels: fixture.levels },
			params: { fixture: name }
		}
	}).body;
}

const body = renderFixture('levels');

/** The text of each element tagged for `levels`, in order. */
function tagged(levels: string, tag = '[a-z]+', html = body) {
	const pattern = new RegExp(
		`<(${tag})\\b[^>]*data-levels="${levels}"[^>]*>([\\s\\S]*?)</\\1>`,
		'g'
	);
	return [...html.matchAll(pattern)].map(([, , inner]) =>
		inner
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

describe('Recap cards and the quiz', () => {
	const html = renderFixture('recap-and-quiz');

	it('hold per-level recap points in passages', () => {
		expect(html).toMatch(/<li>Shared point\.<\/li>/);
		expect(tagged('simple', 'div', html)).toEqual(['Simple point.']);
		expect(tagged('deep', 'div', html)).toEqual(['Deep point.']);
	});

	it('tag only the questions written for some levels', () => {
		expect(html).toMatch(/<li>\s*<fieldset[^>]*>\s*<legend[^>]*>Shared question\?/);
		expect(tagged('simple', 'li', html)[0]).toMatch(/^Simple question\?/);
		expect(tagged('deep', 'li', html)[0]).toMatch(/^Deep question\?/);
	});
});
