import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/** WCAG 2.0–2.2 A and AA, plus axe's best practices (heading order, landmarks). */
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];

/** One rule excused on the elements matching `selector` on one page, and why. */
export interface AxeException {
	rule: string;
	path: string;
	selector: string;
	reason: string;
}

/** Every excused violation on the site. `a11y.e2e.ts` checks each still matches something. */
export const EXCEPTIONS: readonly AxeException[] = [];

/** Runs axe on the page, or on `include` alone, and fails with the rule, its meaning, and the elements for each violation. */
export async function expectAccessible(
	page: Page,
	{
		label,
		include,
		exceptions = EXCEPTIONS
	}: { label?: string; include?: string; exceptions?: readonly AxeException[] } = {}
) {
	const builder = new AxeBuilder({ page }).withTags(TAGS);
	if (include) builder.include(include);
	const results = await builder.analyze();
	const here = exceptions.filter((e) => e.path === new URL(page.url()).pathname);
	const violations: typeof results.violations = [];
	for (const violation of results.violations) {
		const selectors = here.filter((e) => e.rule === violation.id).map((e) => e.selector);
		const nodes: typeof violation.nodes = [];
		for (const node of violation.nodes) {
			const excused =
				selectors.length > 0 &&
				(await page
					.locator(node.target.join(' '))
					.first()
					.evaluate((el, s) => s.some((selector) => el.matches(selector)), selectors));
			if (!excused) nodes.push(node);
		}
		if (nodes.length) violations.push({ ...violation, nodes });
	}
	if (violations.length) {
		await test.info().attach(`axe${label ? ` ${label}` : ''}.json`, {
			body: JSON.stringify(violations, null, '\t'),
			contentType: 'application/json'
		});
	}
	const lines = violations.map((v) => {
		const targets = v.nodes.slice(0, 5).map((n) => n.target.join(' '));
		return `${v.id}: ${v.help} (${targets.join(', ')}${v.nodes.length > 5 ? ', …' : ''})`;
	});
	expect(lines, label).toEqual([]);
}
