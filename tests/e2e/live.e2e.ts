import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { gotoHydrated } from './helpers.ts';

const LIVE_PAGES = [
	'/guessing-game',
	'/probability-and-sampling',
	'/embeddings',
	'/generating-text',
	'/quirks-and-limits',
	'/prompts-as-documents',
	'/encoders',
	'/seeing-pictures'
];

// The end-to-end build's fake inference worker (tests/e2e/fixtures/fake-inference.worker.ts)
// downloads nothing and answers from made-up numbers: next tokens " fake", " live", " test", " moon";
// blanks "fake", "live", "test".
test.beforeEach(async ({ page }) => {
	await page.addInitScript(() => localStorage.setItem('llm-kitchen:fake-inference', '1'));
});

/** Chooses the Small tier before any page loads, as a visitor who chose it earlier. */
async function chooseSmall(page: Page) {
	await page.addInitScript(() => localStorage.setItem('llm-kitchen:models', 'small'));
}

const badge = (widget: ReturnType<Page['getByRole']>) => widget.locator('.badge');

test('choosing Small downloads it and puts the covered widgets live', async ({ page }) => {
	await gotoHydrated(page, '/downloads');
	await page.getByRole('radio', { name: /^Small/ }).check();
	await expect(page.getByText('The Small tier is ready')).toBeVisible();
	await expect(page.getByRole('banner').getByRole('link', { name: 'Models: Small' })).toBeVisible();
	for (const card of await page.locator('.card .status').all()) {
		await expect(card).toHaveText(/Downloaded|This browser|Running/);
	}

	await gotoHydrated(page, '/encoders');
	const fill = page.getByRole('region', { name: 'Fill in the blank' });
	await expect(badge(fill)).toHaveText('Live · Small · BERT base (8-bit) and GPT-2 small (8-bit)');
});

test('the fill-in-the-blank widget fills your own sentence, and shows its recording again', async ({
	page
}) => {
	await chooseSmall(page);
	await gotoHydrated(page, '/encoders');
	const fill = page.getByRole('region', { name: 'Fill in the blank' });
	await expect(fill.getByText(/are running in your browser/)).toBeVisible();
	await expect(fill.getByRole('rowheader', { name: 'fake' }).first()).toBeVisible();

	await fill.getByLabel('Your own sentence').fill('My dog has no blank.');
	await fill.getByRole('button', { name: 'Fill it in' }).click();
	await expect(fill.getByRole('alert')).toHaveText('Put ___ where the blank goes, once.');
	await fill.getByLabel('Your own sentence').fill('My ___ is red.');
	await fill.getByRole('button', { name: 'Fill it in' }).click();
	await expect(fill.getByText(/Reads only My, the words/)).toBeVisible();

	await fill.getByLabel('Show the recording').check();
	await expect(badge(fill)).toHaveText('Recorded · BERT base and GPT-2 small');
	await expect(fill.getByRole('rowheader', { name: 'top' })).toBeVisible();
	await expect(fill.getByLabel('Your own sentence')).toHaveCount(0);
});

test('the picture matcher scores your own words', async ({ page }) => {
	await chooseSmall(page);
	await gotoHydrated(page, '/seeing-pictures');
	const match = page.getByRole('region', { name: 'Match words to pictures' });
	await expect(badge(match)).toHaveText('Live · Small · CLIP ViT-B/32 text half (4-bit)');
	await match.getByLabel('Your own words').fill('a purple hexagon');
	await match.getByRole('button', { name: 'Match them' }).click();
	await expect(match.getByLabel('Words', { exact: true })).toHaveValue('16');
	await expect(match.locator('li.best')).toHaveCount(1);
});

test('the guessing game continues your own beginning', async ({ page }) => {
	await chooseSmall(page);
	await gotoHydrated(page, '/guessing-game');
	const game = page.getByRole('region', { name: 'Guess the next word' });
	await expect(badge(game)).toHaveText('Live · Small · GPT-2 small (8-bit)');
	await game.getByLabel('Start of a sentence').fill('Once upon a');
	await game.getByRole('button', { name: 'Use it' }).click();
	await game.getByLabel('Once upon a …').fill('moon');
	await game.getByRole('button', { name: /Compare/ }).click();
	await expect(game.locator('.result')).toContainText('its number 4 guess out of the 4 it gave');
});

test('the three temperatures run live, on your own beginning too', async ({ page }) => {
	await chooseSmall(page);
	await gotoHydrated(page, '/probability-and-sampling');
	const runs = page.getByRole('region', { name: 'Same prompt, three temperatures' });
	await expect(badge(runs)).toHaveText('Live · Small · GPT-2 small (8-bit)');
	await expect(runs.locator('figure').first()).toContainText('The cat sat on the fake fake');
	await runs.getByLabel('Your own beginning').fill('Hello');
	await runs.getByRole('button', { name: 'Run all three' }).click();
	await expect(runs.locator('figure').first()).toContainText('Hello fake fake');
});

test('the meaning map and the generators take your own words', async ({ page }) => {
	await chooseSmall(page);
	await gotoHydrated(page, '/embeddings');
	const map = page.getByRole('region', { name: 'A map of meaning' });
	await map.getByLabel('Your word').fill('zebra');
	await map.getByRole('button', { name: 'Add to the map' }).click();
	await expect(map.getByText(/Nearest to zebra/)).toBeVisible();

	await gotoHydrated(page, '/generating-text');
	const generator = page.getByRole('region', { name: 'Glass-box generator' });
	await generator.getByLabel('or your own').fill('Hello');
	await generator.getByRole('button', { name: 'Start' }).click();
	await expect(generator.getByRole('button', { name: /Add “·fake”/ })).toBeEnabled();

	await gotoHydrated(page, '/prompts-as-documents');
	const variants = page.getByRole('region', { name: 'Change the start of the document' });
	await variants.getByLabel('Your own prompt').fill('Dear Sir,');
	await variants.getByRole('button', { name: 'Show the next token' }).click();
	await expect(variants.getByText(/after “Dear Sir,”/)).toBeVisible();
});

test.describe('live widgets on a phone', () => {
	// Reduced motion, so faded "busy" results aren't caught mid-transition.
	test.use({
		viewport: { width: 375, height: 740 },
		hasTouch: true,
		isMobile: true,
		reducedMotion: 'reduce'
	});
	for (const path of LIVE_PAGES) {
		test(`${path}, live, has no axe violations and doesn't scroll sideways`, async ({ page }) => {
			await chooseSmall(page);
			await gotoHydrated(page, path);
			await expect(page.locator('.badge', { hasText: 'Live · Small' }).first()).toBeVisible();
			await expect(page.getByText(/Loading/)).toHaveCount(0);
			await expect(page.locator('.busy')).toHaveCount(0);
			const results = await new AxeBuilder({ page })
				.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
				.analyze();
			expect(
				results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`)
			).toEqual([]);
			const overflow = await page.evaluate(
				() => document.documentElement.scrollWidth - document.documentElement.clientWidth
			);
			expect(overflow).toBeLessThanOrEqual(0);
		});
	}
});
