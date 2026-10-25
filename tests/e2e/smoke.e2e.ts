import { expect, test } from '@playwright/test';
import { gotoHydrated } from './helpers.ts';

test('landing page lists the written chapters', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('LLM Kitchen');
	await expect(page.getByRole('link', { name: /The guessing game/ })).toBeVisible();
});

test('a chapter page renders its prerendered content', async ({ page }) => {
	await page.goto('/guessing-game');
	await expect(page.getByRole('heading', { level: 1 })).toContainText('The guessing game');
	// The prose line, not the widget's fan, which shows the same text once its trace loads.
	await expect(page.locator('em', { hasText: 'The cat sat on the ___' })).toBeVisible();
});

test('every page credits its author and links to the source in the footer', async ({ page }) => {
	for (const path of ['/', '/guessing-game', '/downloads', '/not-a-chapter']) {
		await page.goto(path);
		const footer = page.getByRole('contentinfo');
		await expect(footer, path).toHaveText('Made by Abraham Williams · Source on GitHub');
		await expect(footer.getByRole('link', { name: 'Abraham Williams' })).toHaveAttribute(
			'href',
			'https://abrah.am/'
		);
		await expect(footer.getByRole('link', { name: 'Source on GitHub' })).toHaveAttribute(
			'href',
			'https://github.com/abraham/llm-kitchen'
		);
	}
});

test('a chapter links to its source on GitHub for editing', async ({ page }) => {
	await page.goto('/guessing-game');
	await expect(page.getByRole('link', { name: 'Edit this chapter on GitHub' })).toHaveAttribute(
		'href',
		'https://github.com/abraham/llm-kitchen/edit/main/src/lib/chapters/guessing-game/chapter.svx'
	);
});

test('a chapter offers the share sheet where the browser has one', async ({ page }) => {
	await page.addInitScript(() => {
		navigator.share = async (data) => {
			(window as unknown as { shared: unknown }).shared = data;
		};
	});
	await gotoHydrated(page, '/guessing-game');
	await page.getByRole('button', { name: 'Share this chapter' }).click();
	expect(await page.evaluate(() => (window as unknown as { shared: unknown }).shared)).toEqual({
		title: 'Ch 0. The guessing game',
		url: 'https://llm.kitchen/guessing-game'
	});
});

test('a chapter has no share button where the browser has no share sheet', async ({ page }) => {
	await page.addInitScript(() => {
		delete (Navigator.prototype as Partial<Navigator>).share;
	});
	await gotoHydrated(page, '/guessing-game');
	await expect(page.getByRole('link', { name: 'Edit this chapter on GitHub' })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Share this chapter' })).toHaveCount(0);
});

test('an unknown chapter is a 404', async ({ page }) => {
	const response = await page.goto('/not-a-chapter');
	expect(response?.status()).toBe(404);
});
