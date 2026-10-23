import { expect, test } from '@playwright/test';
import { label } from '../../curriculum/index.ts';
import { gotoHydrated } from '../../../../tests/e2e/helpers.ts';

test('zoom into the model', async ({ page }) => {
	await gotoHydrated(page, '/recap');
	const picture = page.getByRole('region', { name: 'The whole picture' });
	await picture.getByRole('button', { name: 'Zoom in on the model' }).click();
	await picture.getByRole('button', { name: /Zoom in on 12 transformer blocks/ }).click();
	await expect(
		picture.getByRole('link', { name: `${label('attention')}: Attention` })
	).toBeVisible();
	await picture.getByRole('button', { name: 'The model' }).click();
	await picture.getByRole('button', { name: 'Zoom in on other kinds of models' }).click();
	await expect(
		picture.getByRole('link', { name: `${label('diffusion')}: Painting from noise` })
	).toBeVisible();
	await picture.getByRole('button', { name: 'A chat app or agent' }).click();
	await picture.getByRole('button', { name: 'Zoom in on you' }).click();
	await expect(
		picture.getByRole('link', { name: `${label('few-shot')}: Learning from examples` })
	).toBeVisible();
});
