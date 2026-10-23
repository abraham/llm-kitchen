import { expect, test, type Page } from '@playwright/test';
import { CURRICULUM, findChapter } from '../../src/lib/curriculum/index.ts';
import { SITE_DESCRIPTION, SITE_NAME, SITE_ORIGIN } from '../../src/lib/site.ts';

/** Open Graph, Twitter, and description tags by name, plus the canonical URL. */
function shareTags(page: Page) {
	return page.evaluate(() => {
		const tags: Record<string, string> = {};
		for (const meta of document.head.querySelectorAll<HTMLMetaElement>(
			'meta[property], meta[name="description"], meta[name^="twitter:"]'
		)) {
			tags[meta.getAttribute('property') ?? meta.name] = meta.content;
		}
		tags.canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href ?? '';
		return tags;
	});
}

test('the menu has the full set of sharing tags', async ({ page }) => {
	await page.goto('/');
	await expect(page).toHaveTitle(`${SITE_NAME}: how a large language model works`);
	expect(await shareTags(page)).toEqual({
		description: SITE_DESCRIPTION,
		canonical: `${SITE_ORIGIN}/`,
		'og:site_name': SITE_NAME,
		'og:type': 'website',
		'og:title': `${SITE_NAME}: how a large language model works`,
		'og:description': SITE_DESCRIPTION,
		'og:url': `${SITE_ORIGIN}/`,
		'og:image': `${SITE_ORIGIN}/og/menu.png`,
		'og:image:width': '1200',
		'og:image:height': '630',
		'og:image:alt': expect.stringContaining(SITE_NAME),
		'twitter:card': 'summary_large_image'
	});
});

test('a chapter has the full set of sharing tags', async ({ page }) => {
	const chapter = findChapter('tokens')!;
	await page.goto('/tokens');
	await expect(page).toHaveTitle(`Ch 4. ${chapter.title} · ${SITE_NAME}`);
	expect(await shareTags(page)).toEqual({
		description: chapter.description,
		canonical: `${SITE_ORIGIN}/tokens`,
		'og:site_name': SITE_NAME,
		'og:type': 'article',
		'og:title': `Ch 4. ${chapter.title}`,
		'og:description': chapter.description,
		'og:url': `${SITE_ORIGIN}/tokens`,
		'og:image': `${SITE_ORIGIN}/og/tokens.png`,
		'og:image:width': '1200',
		'og:image:height': '630',
		'og:image:alt': `${SITE_NAME}, Part II: Representation. Ch 4. ${chapter.title}`,
		'twitter:card': 'summary_large_image'
	});
});

test('the site name is LLM Kitchen wherever it shows', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByRole('heading', { level: 1 })).toHaveText(SITE_NAME);
	await expect(page.locator('body')).not.toContainText('llm-kitchen');
	await page.goto('/guessing-game');
	await expect(page.getByRole('link', { name: SITE_NAME })).toHaveAttribute('href', '/');
	await expect(page.locator('body')).not.toContainText('llm-kitchen');
});

test('the favicon, touch icon, and theme colors are set', async ({ page, request }) => {
	await page.goto('/');
	await expect(page.locator('link[rel="icon"][type="image/svg+xml"]')).toHaveCount(1);
	await expect(page.locator('meta[name="theme-color"]')).toHaveCount(2);
	const icon = await request.get('/apple-touch-icon.png');
	expect(icon.headers()['content-type']).toBe('image/png');
});

test('every page has its 1200 × 630 social image', async ({ request }) => {
	for (const name of ['menu', ...CURRICULUM.map((c) => c.slug)]) {
		const response = await request.get(`/og/${name}.png`);
		expect(response.status(), name).toBe(200);
		const png = await response.body();
		expect([png.readUInt32BE(16), png.readUInt32BE(20)], name).toEqual([1200, 630]);
	}
});
