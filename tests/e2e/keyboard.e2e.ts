import { expect, test } from '@playwright/test';
import { gotoHydrated } from './helpers.ts';
import { CHAPTER_PAGES, NOT_FOUND, PAGES } from './pages.ts';

/** More Tab presses than any page has stops; reaching it means focus is stuck. */
const MAX_STOPS = 600;

for (const path of [...PAGES, NOT_FOUND]) {
	test(`${path}: every Tab stop is visible, not under the app bar, and shows focus, and Shift+Tab goes back the same way`, async ({
		page
	}) => {
		await gotoHydrated(page, path);
		await expect(page.getByText(/Loading/)).toHaveCount(0);
		const problems: string[] = [];
		let stops = 0;
		for (; stops < MAX_STOPS; stops++) {
			await page.keyboard.press('Tab');
			const stop = await page.evaluate(() => {
				const el = document.activeElement as HTMLElement | null;
				// Past the last stop, focus leaves the page for the browser's own controls.
				if (!el || el === document.body) return null;
				const name = `${el.tagName.toLowerCase()} "${(el.getAttribute('aria-label') ?? el.textContent ?? '').trim().slice(0, 40)}"`;
				if (el.dataset.swept !== undefined) return { name, repeat: true, problems: [] };
				el.dataset.swept = String(document.querySelectorAll('[data-swept]').length);
				const rect = el.getBoundingClientRect();
				const style = getComputedStyle(el);
				const bar = document.querySelector('.app-bar')!.getBoundingClientRect().bottom;
				const found: string[] = [];
				if (!rect.width || !rect.height || style.visibility === 'hidden') found.push('has no size');
				else if (rect.bottom <= 0 || rect.top >= innerHeight) found.push('is off screen');
				// WCAG 2.4.11: the sticky app bar mustn't cover it. The skip link sits over the bar by design.
				else if (
					!el.closest('.app-bar') &&
					!el.matches('a[href="#content"]') &&
					rect.top < bar - 1 &&
					rect.height < innerHeight - bar
				) {
					found.push('is under the app bar');
				}
				// WCAG 2.4.7: a visible focus indicator.
				const outline = style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0;
				if (!outline && style.boxShadow === 'none') found.push('shows no focus');
				return { name, repeat: false, problems: found };
			});
			if (!stop) break;
			if (stop.repeat) {
				problems.push(`focus came back to ${stop.name} before leaving the page`);
				break;
			}
			problems.push(...stop.problems.map((p) => `${stop.name} ${p}`));
		}
		expect(stops, 'Tab stops before focus left the page').toBeLessThan(MAX_STOPS);
		expect(stops).toBeGreaterThan(0);
		expect(problems).toEqual([]);

		// From the last stop, Shift+Tab visits the same stops in reverse until focus leaves the page.
		await page.locator(`[data-swept="${stops - 1}"]`).focus();
		const back: (number | null)[] = [stops - 1];
		for (let i = 0; i < stops; i++) {
			await page.keyboard.press('Shift+Tab');
			const index = await page.evaluate(() => {
				const swept = (document.activeElement as HTMLElement | null)?.dataset.swept;
				return swept === undefined ? null : Number(swept);
			});
			if (index === null) break;
			back.push(index);
		}
		expect(back).toEqual(Array.from({ length: stops }, (_, i) => stops - 1 - i));
	});
}

for (const path of CHAPTER_PAGES) {
	test(`${path}: Enter opens each glossary popover and Escape closes it, keeping focus on the term`, async ({
		page
	}) => {
		await gotoHydrated(page, path);
		for (const term of await page.locator('.term > .trigger').all()) {
			if (!(await term.isVisible())) continue;
			const popover = page.locator(`#${await term.getAttribute('aria-controls')}`);
			await term.focus();
			await page.keyboard.press('Enter');
			await expect(term).toHaveAttribute('aria-expanded', 'true');
			await expect(popover).toBeVisible();
			await page.keyboard.press('Escape');
			await expect(term).toHaveAttribute('aria-expanded', 'false');
			await expect(popover).toBeHidden();
			await expect(term).toBeFocused();
		}
	});
}
