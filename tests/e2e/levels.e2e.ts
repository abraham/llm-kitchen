import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { gotoHydrated } from './helpers.ts';

// tests/e2e/fixtures/levels.svx, built with VITE_FIXTURES.
const FIXTURE = '/fixtures/levels';

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
	await gotoHydrated(page, FIXTURE);
	for (const level of ['simple', 'standard', 'deep']) {
		await control(page).selectOption(level);
		const results = await new AxeBuilder({ page })
			.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
			.analyze();
		expect(results.violations.map((v) => `${level} ${v.id}: ${v.help}`)).toEqual([]);
	}
});

test('a chapter without passages for a level says so at that level', async ({ page }) => {
	await gotoHydrated(page, '/tokens');
	const notes = page.getByText(/This chapter has no .* passages yet/).filter({ visible: true });
	await expect(notes).toHaveCount(0);
	await control(page).selectOption('deep');
	await expect(notes).toHaveText([
		'This chapter has no In depth passages yet, so it reads like Standard.'
	]);
});
