import { expect, test } from '@playwright/test';
import { label } from '../../curriculum/index.ts';
import { gotoHydrated } from '../../../../tests/e2e/helpers.ts';

test('decode a model name and check the memory', async ({ page }) => {
	await gotoHydrated(page, '/picking-a-model');
	const decoder = page.getByRole('region', { name: 'What the name tells you' });
	await decoder.getByLabel('Model').selectOption('google/gemma-4-E2B-it-qat-mobile-transformers');
	const name = decoder.getByRole('group', { name: 'Parts of the name' });
	await expect(name.getByRole('button')).toHaveText([
		'gemma-4',
		'E2B',
		'it',
		'qat',
		'mobile',
		'transformers'
	]);
	await name.getByRole('button', { name: 'qat' }).click();
	await expect(decoder.locator('.selected')).toContainText('Quantization-aware training');
	await expect(decoder).toContainText('128K tokens');

	const memory = page.getByRole('region', { name: 'Will it fit?' });
	await expect(memory.locator('.total')).toContainText('61 GB');
	await memory.getByLabel('4', { exact: true }).check();
	await expect(memory.locator('.total')).toContainText('15 GB');

	await decoder.getByLabel('Model').selectOption('google/gemma-4-26B-A4B-it');
	await decoder.getByRole('link', { name: `${label('mixture-of-experts')}:` }).click();
	await expect(page).toHaveURL(/\/mixture-of-experts\/?$/);
});
