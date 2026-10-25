import { expect, test } from '@playwright/test';
import { gotoHydrated } from '../../../../tests/e2e/helpers.ts';

test('a trace shows every call of the chosen run', async ({ page }) => {
	await gotoHydrated(page, '/testing-agents');
	const widget = page.getByRole('region', { name: 'Everything one run did' });
	const trace = widget.getByRole('table');
	await expect(trace.getByRole('row')).toHaveCount(9);
	await expect(trace).toContainText('delete_file(taxes.pdf)');
	await expect(widget.locator('.readouts')).toContainText('4,179');

	await widget.getByLabel('Run').selectOption({ label: 'Count the words in the cat rhyme' });
	await expect(trace.getByRole('row')).toHaveCount(4);
	await expect(trace).toContainText('Answer: The nursery rhyme "Hey Diddle Diddle" contains 30');
	await expect(widget.locator('.readouts')).toContainText('with an answer');
});

test('showing the grader a correct answer changes its verdicts', async ({ page }) => {
	await gotoHydrated(page, '/testing-agents');
	const widget = page.getByRole('region', { name: 'Seven tests, three kinds of check' });
	const noTools = widget.getByRole('row', { name: /no tools/ });
	await expect(noTools.getByRole('cell').nth(0)).toContainText('fail');
	await expect(noTools.getByRole('cell').nth(2)).toContainText('pass');
	await expect(widget.getByRole('status')).toContainText('2 of the 5 answers');

	await widget.getByLabel('Show the grader a correct answer').check();
	await expect(noTools.getByRole('cell').nth(2)).toContainText('fail');
	await expect(widget.getByRole('status')).toContainText('3 of the 5 answers');
	await expect(widget.getByText('The correct answer the grader is shown')).toBeVisible();
	await expect(widget.locator('.grader')).toContainText('7006652 is incorrect');
});
