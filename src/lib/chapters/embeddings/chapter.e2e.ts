import { expect, test } from '@playwright/test';
import { gotoHydrated } from '../../../../tests/e2e/helpers.ts';

test('tokens become vectors, and the map shows neighbors and the analogy', async ({ page }) => {
	await gotoHydrated(page, '/embeddings');
	const vectors = page.getByRole('region', { name: 'From token to vector' });
	await vectors.getByRole('button', { name: 'Next →' }).click();
	await expect(
		vectors.getByRole('img', { name: /Vector for cat: a list of 768 numbers/ })
	).toBeVisible();

	const map = page.getByRole('region', { name: 'A map of meaning' });
	await expect(map.getByText(/Nearest to cat/)).toContainText('kitten');
	await map.getByLabel('Word', { exact: true }).selectOption('paris');
	await expect(map.getByText(/Nearest to paris/)).toContainText('france');
	await map.getByLabel('Show king − man + woman').check();
	await expect(map.getByText(/lands closest to/)).toContainText('queen');

	// Under Recorded, the live option points to the Models page instead of downloading anything.
	await expect(map.getByRole('link', { name: 'Choose a model tier' })).toHaveAttribute(
		'href',
		'/downloads'
	);
	await expect(map.getByLabel('Your word')).toHaveCount(0);
});
