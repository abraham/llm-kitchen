import { expect, test } from '@playwright/test';
import { EXCEPTIONS, expectAccessible } from './a11y.ts';
import { gotoHydrated } from './helpers.ts';

test('the scan helper fails on a violation, naming the rule and element, and an exception excuses it', async ({
	page
}) => {
	await gotoHydrated(page, '/');
	await page.evaluate(() => {
		const button = document.createElement('button');
		button.id = 'nameless';
		document.querySelector('main')!.append(button);
	});
	await expect(expectAccessible(page)).rejects.toThrow(/button-name: .*#nameless/);
	await expectAccessible(page, {
		exceptions: [{ rule: 'button-name', path: '/', selector: '#nameless', reason: 'This test' }]
	});
});

for (const { rule, path, selector, reason } of EXCEPTIONS) {
	test(`the ${rule} exception on ${path} still matches ${selector}`, async ({ page }) => {
		expect(reason.trim()).not.toBe('');
		await gotoHydrated(page, path);
		await expect(page.locator(selector).first()).toBeAttached();
	});
}
