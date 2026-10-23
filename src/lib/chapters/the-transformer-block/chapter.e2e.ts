import { expect, test } from '@playwright/test';
import { gotoHydrated } from '../../../../tests/e2e/helpers.ts';

test('the block builder adds up to GPT-2 small, and the logit lens reads each block', async ({
	page
}) => {
	await gotoHydrated(page, '/the-transformer-block');
	const builder = page.getByRole('region', { name: 'Build a transformer' });
	for (let i = 0; i < 5; i++) await builder.getByRole('button', { name: 'Next →' }).click();
	await expect(builder.getByText('= GPT-2 small’s 124,439,808')).toBeVisible();

	const stream = page.getByRole('region', { name: 'Watch the guess form' });
	const slider = stream.getByLabel(/Read the stream/);
	await slider.fill('3');
	await expect(stream.locator('.readout')).toContainText('·same');
	await slider.fill('12');
	await expect(stream.locator('.readout')).toContainText('·floor');
});
