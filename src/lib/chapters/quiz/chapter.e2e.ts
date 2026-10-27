import { expect, test } from '@playwright/test';
import { label } from '../../curriculum/index.ts';
import { gotoHydrated } from '../../../../tests/e2e/helpers.ts';

test('take the quiz and see what to revisit', async ({ page }) => {
	await gotoHydrated(page, '/quiz');
	const quiz = page.getByRole('region', { name: 'Quick check' });
	for (const answer of [
		'The model thinks for longer',
		'It reads tokens, not letters',
		'Training nudges every weight to make the right next token a little more likely',
		'It lets each token pull in information from any earlier token',
		'Probabilities for the next token',
		'It needs about a quarter of the memory, and coarse rounding can hurt its answers',
		'It is exactly the same, written in fewer passes of the big model',
		'It writes scratch work as tokens before answering',
		'Nothing but its context: attention can copy the pattern from the examples',
		'The harness',
		'The provider reuses its work on the unchanged start of the prompt',
		'The model reads the page and your request as one stream of text',
		'Guardrails in the harness, like asking you first',
		'Its attention can look at the words after the blank too',
		'It plays like the best runs it has seen',
		'Rewording an email you’ll read before you send it'
	]) {
		await quiz.getByLabel(answer, { exact: true }).check();
	}
	await quiz.getByRole('button', { name: 'Check my answers' }).click();
	await expect(quiz.getByText('15 of 16 right.')).toBeVisible();
	const revisit = quiz.locator('.revisit');
	await expect(revisit.getByRole('link')).toHaveCount(1);
	await revisit.getByRole('link', { name: `${label('probability-and-sampling')}:` }).click();
	await expect(page).toHaveURL(/\/probability-and-sampling\/?$/);
});
