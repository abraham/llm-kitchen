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

	const figure = map.getByRole('img', { name: /Words placed by meaning in three directions/ });
	await expect(figure).toHaveAccessibleName(/turned 30° and tilted 20°/);
	await map.getByRole('slider', { name: /Turn/ }).fill('0');
	await map.getByRole('slider', { name: /Tilt/ }).fill('0');
	await expect(figure).toHaveAccessibleName(/turned 0° and tilted 0°/);

	// Dragging sideways turns the map, and doesn't select the word under the pointer.
	const box = (await figure.boundingBox())!;
	await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
	await page.mouse.down();
	await page.mouse.move(box.x + box.width / 2 + 60, box.y + box.height / 2, { steps: 5 });
	await page.mouse.up();
	await expect(figure).toHaveAccessibleName(/turned 30° and tilted 0°/);
	await expect(map.getByText(/Nearest to paris/)).toBeVisible();

	// Under Recorded, the live option points to the Models page instead of downloading anything.
	await expect(map.getByRole('link', { name: 'Choose a model tier' })).toHaveAttribute(
		'href',
		'/downloads'
	);
	await expect(map.getByLabel('Your word')).toHaveCount(0);
});
