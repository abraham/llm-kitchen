import { compile } from 'mdsvex';
import { describe, expect, it } from 'vitest';
import { remarkMath, texToMathML } from './mdsvex-math.ts';

const render = async (source: string) =>
	(await compile(source, { remarkPlugins: [remarkMath] }))?.code ?? '';

describe('remarkMath', () => {
	it('turns inline and block TeX into MathML', async () => {
		const html = await render('Scores are $q \\cdot k$ here.\n\n$$\n\\sqrt{d_k}\n$$\n');
		expect(html).toMatch(/<p>Scores are <math><mrow><mi>q<\/mi>.*<\/math> here\.<\/p>/);
		expect(html).toMatch(/<math display="block"[^>]*>.*<msqrt>/);
	});

	it('converts math inside components', async () => {
		const html = await render('<At levels="deep">\n\nThe size $d_k$.\n\n</At>\n');
		expect(html).toMatch(/<At levels="deep">[\s\S]*<math>.*<msub>/);
	});

	it('leaves prices, entity dollars, and code alone', async () => {
		const html = await render('It costs $5 and $6. A dollar: &#36;x&#36;. Code: `$y$` and `$`.');
		expect(html).not.toContain('<math');
		expect(html).toContain('$5 and $6');
		expect(html).toContain('<code>$y$</code>');
	});

	it("escapes braces so Svelte doesn't read them as expressions", () => {
		expect(texToMathML('\\{x\\}', false)).not.toMatch(/[{}]/);
		expect(texToMathML('\\{x\\}', false)).toContain('&#123;');
	});

	it('fails on TeX it cannot read', () => {
		expect(() => texToMathML('\\frac{a', false)).toThrow();
	});
});
