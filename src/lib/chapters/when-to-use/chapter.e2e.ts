import { expect, test } from '@playwright/test';
import { gotoHydrated } from '../../../../tests/e2e/helpers.ts';

test('the four questions sort tasks and show what to do instead', async ({ page }) => {
	await gotoHydrated(page, '/when-to-use');
	const widget = page.getByRole('region', { name: 'Should a model do this?' });
	const verdict = widget.locator('.verdict');
	await expect(verdict).toHaveText('A good job for a model. Read the result before you use it.');

	await widget.getByLabel('Task').selectOption({ label: 'Multiply 1234 by 5678' });
	await expect(verdict).toHaveText('Reach for the simpler tool first.');
	await expect(widget.getByText(/got 7,050,952/)).toBeVisible();

	await widget.getByLabel('Task').selectOption({ label: 'Say what our team decided last week' });
	await expect(verdict).toHaveText('A model can help, with the fix below.');
	await expect(widget.getByText(/nine different authors/)).toBeVisible();

	const check = widget.getByRole('group', { name: /check the result quickly/ });
	await check.getByLabel('No').check();
	await expect(widget.getByLabel('Task')).toHaveValue('custom');
	await expect(verdict).toHaveText('Not a job for a model on its own. See the fixes below.');
	await expect(widget.getByText(/Eddy Merckx every time/)).toBeVisible();
});
