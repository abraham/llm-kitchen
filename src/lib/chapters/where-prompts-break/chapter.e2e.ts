import { expect, test } from '@playwright/test';
import { gotoHydrated } from '../../../../tests/e2e/helpers.ts';

test('order, layout, and position', async ({ page }) => {
	await gotoHydrated(page, '/where-prompts-break');
	const widget = page.getByRole('region', { name: 'Small changes, different answers' });
	await expect(widget.getByRole('row', { name: /8 of 8/ })).toBeVisible();
	await widget.getByLabel('Formatting').check();
	await expect(widget.getByRole('row', { name: /Sentiment.*7 of 8/ })).toBeVisible();
	await widget.getByLabel('Position in a long prompt').check();
	await expect(widget.getByText(/8 of 88 answers went wrong/)).toBeVisible();
});

test('word problems with an extra sentence and over several turns', async ({ page }) => {
	await gotoHydrated(page, '/where-prompts-break');
	const extra = page.getByRole('region', { name: 'One extra sentence', exact: true });
	await expect(extra.getByText('18 of 24 right')).toBeVisible();
	await expect(extra.getByText('17 of 24 right')).toBeVisible();
	await expect(extra.getByText(/right answer is 33; the model answered 63\./)).toBeVisible();
	await extra.getByLabel('All in one message').check();
	await expect(extra.getByText(/the model answered/)).toBeVisible();
	const turns = page.getByRole('region', { name: 'Details over several turns', exact: true });
	await expect(turns.getByText(/right answer is 1,600; the model answered 40\./)).toBeVisible();
	await turns.getByLabel('Problem').selectOption({ label: 'How many carrots are left? ✓✗' });
	await expect(turns.getByText(/right answer is 37; the model answered 11\./)).toBeVisible();
});
