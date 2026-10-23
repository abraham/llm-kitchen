import { expect, test } from '@playwright/test';
import { gotoHydrated } from '../../../../tests/e2e/helpers.ts';

test('the chat template and base vs. instruct', async ({ page }) => {
	await gotoHydrated(page, '/predictor-to-assistant');
	const template = page.getByRole('region', { name: 'What the model actually reads' });
	await template.getByLabel('Your next message').fill('Hello there');
	await expect(template.getByLabel('The text sent to the model')).toContainText(
		'<|im_start|>user\nHello there<|im_end|>'
	);

	const compare = page.getByRole('region', { name: 'Same words, different models' });
	await expect(compare.getByRole('region', { name: /base model$/ })).toContainText('Options are');
	await compare.getByLabel('Prompt').selectOption({ label: 'What is the capital of France?' });
	await expect(compare.getByRole('region', { name: /in its chat format/ })).toContainText(
		'Stopped by itself'
	);
});
