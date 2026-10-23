import { expect, test } from '@playwright/test';
import { gotoHydrated } from '../../../../tests/e2e/helpers.ts';

test('the recurrent model trains; attention memory grows', async ({ page }) => {
	await gotoHydrated(page, '/recurrent-models');
	const rnn = page.getByRole('region', { name: 'A model with a memory' });
	await rnn.getByRole('button', { name: 'Train' }).click();
	await expect(rnn.getByText(/step [1-9]\d*/)).toBeVisible();
	await rnn.getByRole('button', { name: 'Pause' }).click();
	await expect(
		rnn.getByRole('img', { name: /The model's memory: a list of 32 numbers/ })
	).toBeVisible();

	const growth = page.getByRole('region', { name: 'Memory as the text grows' });
	await growth.getByLabel(/Tokens read so far/).fill('1024');
	await expect(growth.getByText('18,874,368 numbers')).toBeVisible();
	await expect(growth.getByText('32 numbers', { exact: true })).toBeVisible();
});
