import { expect, test } from '@playwright/test';
import { gotoHydrated } from '../../../../tests/e2e/helpers.ts';

test('more subtasks grow one agent’s prompt but not the helpers’', async ({ page }) => {
	await gotoHydrated(page, '/splitting-the-work');
	const widget = page.getByRole('region', { name: 'One agent or a lead with helpers' });
	await expect(widget.getByText('Made-up example')).toBeVisible();
	const longest = widget.getByRole('row', { name: /Longest prompt/ });
	await expect(longest).toContainText('1,110');
	await expect(longest).toContainText('540');

	const slider = widget.getByRole('slider', { name: /Subtasks/ });
	await slider.press('End');
	// Six subtasks of three calls: one agent's last prompt is 300 + 18 × 90; no helper's grows.
	await expect(longest).toContainText('1,920');
	await expect(longest).toContainText('780');
	await expect(
		widget.getByRole('img', { name: /The lead and 6 helpers make 26 calls/ })
	).toBeVisible();
});
