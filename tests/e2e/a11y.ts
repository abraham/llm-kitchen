import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/** WCAG 2.0–2.2 A and AA, plus axe's best practices (heading order, landmarks). */
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];

/** Runs axe on the page, or on `include` alone, and fails with the rule, its meaning, and the elements for each violation. */
export async function expectAccessible(
	page: Page,
	{ label, include }: { label?: string; include?: string } = {}
) {
	const builder = new AxeBuilder({ page }).withTags(TAGS);
	if (include) builder.include(include);
	const { violations } = await builder.analyze();
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
