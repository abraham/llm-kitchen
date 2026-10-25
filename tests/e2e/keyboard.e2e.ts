import { expect, test } from '@playwright/test';
import { gotoHydrated } from './helpers.ts';
import { NOT_FOUND, PAGES } from './pages.ts';

/** More Tab presses than any page has stops; reaching it means focus is stuck. */
const MAX_STOPS = 600;

for (const path of [...PAGES, NOT_FOUND]) {
	test(`${path}: every Tab stop is visible, not under the app bar, and shows focus`, async ({
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
				el.dataset.swept = '';
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
	});
}
