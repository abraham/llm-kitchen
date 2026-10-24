import temml from 'temml';

/**
 * mdsvex remark plugin: TeX between `$…$` (inline) or `$$…$$` (a block of its own) becomes MathML
 * at build time, so pages ship no math JavaScript or fonts. Written for the tokenizer API of the
 * remark-parse version mdsvex bundles. Bad TeX fails the build. A literal dollar sign in prose
 * is written `&#36;`.
 */

interface Eat {
	(subvalue: string): (node: { type: 'html'; value: string }) => unknown;
}
type Tokenizer = ((eat: Eat, value: string, silent?: boolean) => unknown) & {
	locator?: (value: string, fromIndex: number) => number;
};
interface ParserPrototype {
	inlineTokenizers: Record<string, Tokenizer>;
	inlineMethods: string[];
	blockTokenizers: Record<string, Tokenizer>;
	blockMethods: string[];
}

/** TeX to MathML that Svelte reads as markup: braces would otherwise start expressions. */
export function texToMathML(tex: string, displayMode: boolean): string {
	return temml
		.renderToString(tex.trim(), { displayMode, throwOnError: true })
		.replaceAll('{', '&#123;')
		.replaceAll('}', '&#125;');
}

// Opening `$` followed by a non-space, closing `$` after a non-space and not before a digit; no
// line breaks or code spans inside.
const INLINE = /^\$(?=\S)((?:\\.|[^\\$\n`])+?)(?<=\S)\$(?!\d)/;
const BLOCK = /^\$\$([\s\S]+?)\$\$(?=[ \t]*(?:\n|$))/;

const inlineMath: Tokenizer = (eat, value, silent) => {
	const match = INLINE.exec(value);
	if (!match) return;
	if (silent) return true;
	return eat(match[0])({ type: 'html', value: texToMathML(match[1], false) });
};
inlineMath.locator = (value, fromIndex) => value.indexOf('$', fromIndex);

const blockMath: Tokenizer = (eat, value, silent) => {
	const match = BLOCK.exec(value);
	if (!match) return;
	if (silent) return true;
	return eat(match[0])({ type: 'html', value: texToMathML(match[1], true) });
};

export function remarkMath(this: { Parser: { prototype: ParserPrototype } }) {
	const parser = this.Parser.prototype;
	parser.inlineTokenizers.math = inlineMath;
	parser.inlineMethods.splice(parser.inlineMethods.indexOf('text'), 0, 'math');
	parser.blockTokenizers.math = blockMath;
	parser.blockMethods.splice(parser.blockMethods.indexOf('paragraph'), 0, 'math');
}
