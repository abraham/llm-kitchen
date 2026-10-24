import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { CURRICULUM } from '../../src/lib/curriculum/index.ts';
import { gotoHydrated } from './helpers.ts';

// Test-only pages in tests/e2e/fixtures, built with VITE_FIXTURES.
const FIXTURE = '/fixtures/levels';
const RECAP_AND_QUIZ = '/fixtures/recap-and-quiz';

/** A chapter whose chapter.ts lists no levels yet, if any is left. */
const UNLEVELED = CURRICULUM.map((c) => c.slug).find((slug) => {
	const config = `src/lib/chapters/${slug}/chapter.ts`;
	return !existsSync(config) || !/export const levels\b/.test(readFileSync(config, 'utf8'));
});

const control = (page: Page) => page.getByRole('banner').getByLabel('Explanations');
const top = (page: Page, text: string) =>
	page.getByText(text).evaluate((el) => el.getBoundingClientRect().top);

/** The citation numbers and the sources list the reader sees. */
async function visibleCitations(page: Page) {
	return {
		numbers: await page.locator('sup.cite a:visible').allTextContents(),
		sources: await page.locator('.sources:visible li a').allTextContents()
	};
}

test('Standard is the default, and the control switches passages, citations, and sources', async ({
	page
}) => {
	const violations: string[] = [];
	page.on('console', (m) => {
		if (/Content Security Policy/i.test(m.text())) violations.push(m.text());
	});
	await gotoHydrated(page, FIXTURE);
	const html = page.locator('html');
	const simple = page.getByText('Simple passage');
	const standard = page.getByText('Standard passage');
	const deep = page.getByText('Deep passage');

	await expect(control(page)).toHaveValue('standard');
	await expect(html).not.toHaveAttribute('data-level');
	await expect(standard).toBeVisible();
	await expect(simple).toBeHidden();
	await expect(deep).toBeHidden();
	await expect(page.getByText('precise', { exact: true })).toBeVisible();
	expect(await visibleCitations(page)).toEqual({
		numbers: ['[1]', '[2]', '[2]'],
		sources: [expect.stringMatching(/^A mathematical theory/i), expect.stringMatching(/English/)]
	});

	await control(page).selectOption('simple');
	await expect(html).toHaveAttribute('data-level', 'simple');
	await expect(simple).toBeVisible();
	await expect(standard).toBeHidden();
	await expect(page.getByText('plain', { exact: true })).toBeVisible();
	expect((await visibleCitations(page)).numbers).toEqual(['[1]', '[2]', '[3]']);
	expect(await page.evaluate(() => localStorage.getItem('llm-kitchen:level'))).toBe('simple');

	await control(page).selectOption('deep');
	await expect(deep).toBeVisible();
	await expect(standard).toBeVisible();
	await expect(simple).toBeHidden();
	expect((await visibleCitations(page)).numbers).toEqual(['[1]', '[2]', '[3]', '[2]']);

	// Each visible number links to its entry in the visible list.
	await page.locator('sup.cite a:visible').nth(2).click();
	await expect(page.locator('.sources:visible li').nth(2)).toBeInViewport();
	await expect(page.locator('.sources:visible li').nth(2)).toContainText('GPT-2 model card');

	await control(page).selectOption('standard');
	await expect(html).not.toHaveAttribute('data-level');
	expect(await page.evaluate(() => localStorage.getItem('llm-kitchen:level'))).toBeNull();
	expect(violations).toEqual([]);
});

test('the saved level applies before hydration and survives reloads', async ({ page }) => {
	await gotoHydrated(page, FIXTURE);
	await control(page).selectOption('deep');

	await page.goto(FIXTURE);
	await expect(page.locator('html')).toHaveAttribute('data-level', 'deep');
	await expect(page.getByText('Deep passage')).toBeVisible();
	await page.waitForSelector('html[data-hydrated]');
	await expect(control(page)).toHaveValue('deep');
});

test('switching keeps the reader in place', async ({ page }) => {
	await gotoHydrated(page, FIXTURE);

	// The block at the top of the content (just below the 56px app bar) stays put while a passage
	// above it appears.
	const closing = 'Shared closing paragraph';
	await page.getByText(closing).evaluate((el) => scrollBy(0, el.getBoundingClientRect().top - 70));
	const before = await top(page, closing);
	await control(page).selectOption('deep');
	expect(Math.abs((await top(page, closing)) - before)).toBeLessThanOrEqual(1);

	// A passage at the top that the new level hides is replaced in the same place.
	await control(page).selectOption('standard');
	await page
		.getByText('Standard passage')
		.evaluate((el) => scrollBy(0, el.getBoundingClientRect().top - 40));
	await control(page).selectOption('simple');
	expect(Math.abs((await top(page, 'Simple passage')) - 40)).toBeLessThanOrEqual(1);
});

test('each level has no axe violations', async ({ page }) => {
	for (const path of [FIXTURE, RECAP_AND_QUIZ]) {
		await gotoHydrated(page, path);
		for (const level of ['simple', 'standard', 'deep']) {
			await control(page).selectOption(level);
			const results = await new AxeBuilder({ page })
				.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
				.analyze();
			expect(results.violations.map((v) => `${path} ${level} ${v.id}: ${v.help}`)).toEqual([]);
		}
	}
});

test('recap cards and the quiz show and score the current level', async ({ page }) => {
	const quiz = page.getByRole('region', { name: 'Quick check' });
	const points = page.getByRole('region', { name: 'Recap' }).getByRole('listitem');
	const asked = quiz.locator('legend:visible');
	const answers: Record<string, string[]> = {
		standard: ['Shared right'],
		simple: ['Shared right', 'Simple wrong'],
		deep: ['Shared wrong', 'Deep right']
	};
	const expected: Record<string, [string[], string[], string, number]> = {
		standard: [['Shared point.'], ['Shared question?'], '1 of 1 right.', 0],
		simple: [
			['Shared point.', 'Simple point.'],
			['Shared question?', 'Simple question?'],
			'1 of 2 right.',
			1
		],
		deep: [
			['Shared point.', 'Deep point.'],
			['Shared question?', 'Deep question?'],
			'1 of 2 right.',
			1
		]
	};
	for (const level of ['standard', 'simple', 'deep']) {
		await gotoHydrated(page, RECAP_AND_QUIZ);
		await control(page).selectOption(level);
		const [recap, questions, score, misses] = expected[level];
		await expect(points.filter({ visible: true })).toHaveText(recap);
		await expect(asked).toHaveText(questions);
		const check = quiz.getByRole('button', { name: 'Check my answers' });
		for (const answer of answers[level]) {
			await expect(check).toBeDisabled();
			await quiz.getByLabel(answer, { exact: true }).check();
		}
		await check.click();
		await expect(quiz.getByRole('status')).toHaveText(score);
		await expect(quiz.locator('.revisit').getByRole('link')).toHaveCount(misses);
	}
});

test('a chapter without passages for a level says so at that level', async ({ page }) => {
	test.skip(!UNLEVELED, 'every chapter has passages for every level');
	await gotoHydrated(page, `/${UNLEVELED}`);
	const notes = page.getByText(/This chapter has no .* passages yet/).filter({ visible: true });
	await expect(notes).toHaveCount(0);
	await control(page).selectOption('deep');
	await expect(notes).toHaveText([
		'This chapter has no In depth passages yet, so it reads like Standard.'
	]);
});

test('the pilot chapters read differently at each level, with equations only In depth', async ({
	page
}) => {
	// A phrase only each level's passages use.
	const PHRASES: Record<string, Record<string, string>> = {
		'/tokens': {
			simple: 'cuts up your text',
			standard: 'splits your text',
			deep: 'vocabulary, counted'
		},
		'/attention': {
			simple: 'what it has to offer)',
			standard: 'turned into three new vectors',
			deep: 'Written out for every token at once'
		},
		'/the-agent-loop': {
			simple: 'So there are two loops',
			standard: 'popularized by the ReAct',
			deep: 'What the loop costs'
		}
	};
	for (const [path, phrases] of Object.entries(PHRASES)) {
		await gotoHydrated(page, path);
		for (const level of ['simple', 'standard', 'deep']) {
			await control(page).selectOption(level);
			await expect(page.getByText(phrases[level]).first(), `${path} ${level}`).toBeVisible();
			const others = Object.entries(phrases).filter(
				([l]) => l !== level && !(level === 'deep' && l === 'standard')
			);
			for (const [other, phrase] of others) {
				await expect(
					page.getByText(phrase).first(),
					`${path} ${level} hides ${other}`
				).toBeHidden();
			}
			await expect(page.locator('math:visible').first()).toBeVisible({
				visible: level === 'deep'
			});
			await expect(
				page.getByText(/This chapter has no .* passages yet/).filter({ visible: true })
			).toHaveCount(0);
		}
	}
});
