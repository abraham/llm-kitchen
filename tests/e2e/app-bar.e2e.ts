import { expect, test } from '@playwright/test';
import { SITE_NAME } from '../../src/lib/site.ts';
import { gotoHydrated } from './helpers.ts';

const LIGHT_PAGE = 'rgb(251, 248, 243)';
const DARK_PAGE = 'rgb(28, 26, 23)';
const pageColor = (page: import('@playwright/test').Page) =>
	page.evaluate(() => getComputedStyle(document.body).backgroundColor);

const themeColor = (page: import('@playwright/test').Page) =>
	page.evaluate(
		() =>
			[...document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')].find(
				(m) => matchMedia(m.media).matches
			)?.content
	);

test('the app bar shows the brand and a theme toggle on every page, and stays in view', async ({
	page
}) => {
	for (const path of ['/', '/guessing-game']) {
		await gotoHydrated(page, path);
		const bar = page.getByRole('banner');
		await expect(bar.getByRole('link', { name: SITE_NAME })).toHaveAttribute('href', '/');
		await expect(bar.getByRole('button', { name: /^Theme: / })).toBeVisible();
		await page.mouse.wheel(0, 2000);
		await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(500);
		expect((await bar.boundingBox())?.y).toBe(0);
	}
});

test('the toggle starts on auto, steps through light and dark, and remembers them', async ({
	page
}) => {
	const violations: string[] = [];
	page.on('console', (m) => {
		if (/Content Security Policy/i.test(m.text())) violations.push(m.text());
	});
	await page.emulateMedia({ colorScheme: 'dark' });
	await gotoHydrated(page, '/guessing-game');
	const toggle = page.getByRole('button', { name: /^Theme: / });
	const html = page.locator('html');
	await expect(toggle).toHaveAccessibleName('Theme: Auto (matches your system)');
	await expect(html).not.toHaveAttribute('data-theme');
	expect(await pageColor(page)).toBe(DARK_PAGE);

	await toggle.click();
	await expect(toggle).toHaveAccessibleName('Theme: Light');
	await expect(html).toHaveAttribute('data-theme', 'light');
	expect(await pageColor(page)).toBe(LIGHT_PAGE);
	expect(await themeColor(page)).toBe('#fbf8f3');

	await toggle.click();
	await expect(toggle).toHaveAccessibleName('Theme: Dark');
	await page.emulateMedia({ colorScheme: 'light' });
	expect(await pageColor(page)).toBe(DARK_PAGE);
	expect(await themeColor(page)).toBe('#1c1a17');

	// The inline script applies the saved choice before the app hydrates.
	await page.goto('/attention');
	await expect(html).toHaveAttribute('data-theme', 'dark');
	await page.waitForSelector('html[data-hydrated]');
	await expect(toggle).toHaveAccessibleName('Theme: Dark');

	await toggle.click();
	await expect(toggle).toHaveAccessibleName('Theme: Auto (matches your system)');
	await expect(html).not.toHaveAttribute('data-theme');
	expect(await pageColor(page)).toBe(LIGHT_PAGE);
	expect(await page.evaluate(() => localStorage.getItem('llm-kitchen:theme'))).toBeNull();
	expect(violations).toEqual([]);
});
