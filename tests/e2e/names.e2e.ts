import { expect, test } from '@playwright/test';
import { gotoHydrated } from './helpers.ts';
import { NOT_FOUND } from './pages.ts';

// Axe checks that controls have names, not that they're the right ones. These pin the names and
// roles of the chrome every page shares; update with `--update-snapshots` when a change is meant.

test.beforeEach(async ({ page }) => {
	// The share button depends on the browser, so every run sees the same chrome without it.
	await page.addInitScript(() => {
		delete (Navigator.prototype as Partial<Navigator>).share;
	});
});

test('the app bar, on a chapter', async ({ page }) => {
	await gotoHydrated(page, '/tokens');
	await expect(page.locator('.app-bar')).toMatchAriaSnapshot({ name: 'app-bar.aria.yml' });
});

test("a chapter's header, Ingredients box, and footer", async ({ page }) => {
	await gotoHydrated(page, '/tokens');
	const main = page.getByRole('main');
	await expect(main.locator('> header')).toMatchAriaSnapshot({ name: 'chapter-header.aria.yml' });
	await expect(main.locator('> .ingredients')).toMatchAriaSnapshot({
		name: 'chapter-ingredients.aria.yml'
	});
	await expect(main.locator('> footer')).toMatchAriaSnapshot({ name: 'chapter-footer.aria.yml' });
	await expect(page.getByRole('contentinfo')).toMatchAriaSnapshot({ name: 'site-footer.aria.yml' });
});

test("the Models page's tier choice and a model card", async ({ page }) => {
	await gotoHydrated(page, '/downloads');
	await expect(page.getByRole('group', { name: 'Widgets' })).toMatchAriaSnapshot({
		name: 'tier-choice.aria.yml'
	});
	await expect(page.getByRole('region', { name: 'all-MiniLM-L6-v2' })).toMatchAriaSnapshot({
		name: 'model-card.aria.yml'
	});
});

test('the 404 page', async ({ page }) => {
	await gotoHydrated(page, NOT_FOUND);
	await expect(page.getByRole('main')).toMatchAriaSnapshot({ name: 'not-found.aria.yml' });
});
