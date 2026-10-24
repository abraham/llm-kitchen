import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const dir = 'src/lib/chapters';
const widgets = readdirSync(dir, { recursive: true, encoding: 'utf8' })
	.filter((f) => f.endsWith('.svelte'))
	.map((file) => ({ file, source: readFileSync(`${dir}/${file}`, 'utf8') }));

/** Hand-written markup the common set in docs/spec/components.md provides, and who may still write it. */
const PATTERNS: { name: string; use: string; pattern: RegExp; allowed: Record<string, string> }[] =
	[
		{
			name: 'a fieldset',
			use: 'Choice',
			pattern: /<fieldset\b/,
			allowed: {
				'quiz/Quiz.svelte': 'graded options that show right and wrong and lock',
				'a-neuron/LayerPlayground.svelte': 'checkboxes that pick several neurons',
				'tokens/LiveTokenizer.svelte': 'checkboxes that pick several tokenizers'
			}
		},
		{
			name: 'a select',
			use: 'Choice with appearance="select"',
			pattern: /<select\b/,
			allowed: { 'picking-a-model/NameDecoder.svelte': 'models grouped with <optgroup>' }
		},
		{
			name: 'a range input',
			use: 'Slider',
			pattern: /type="range"/,
			allowed: {
				'the-context-problem/ContextWindow.svelte': 'readout mid-sentence beside preset buttons',
				'the-transformer-block/ResidualStream.svelte': 'label reserves its widest wording'
			}
		},
		{
			name: 'scoped range input styles',
			use: 'the global input[type=range] rule or Slider',
			pattern: /^\s+input\[type='range'\]/m,
			allowed: {
				'the-context-problem/ContextWindow.svelte': 'its own range input, above',
				'the-transformer-block/ResidualStream.svelte': 'its own range input, above'
			}
		},
		{
			name: 'a checkbox',
			use: 'Toggle',
			pattern: /type="checkbox"/,
			allowed: {
				'a-neuron/LayerPlayground.svelte': 'a group that picks several',
				'tokens/LiveTokenizer.svelte': 'a group that picks several'
			}
		},
		{
			name: 'scoped select styles',
			use: 'the global select rule',
			pattern: /^\s+select[\s,{.:[]/m,
			allowed: {}
		},
		{
			name: 'the scrollable attachment',
			use: 'ScrollBox or PromptText',
			pattern: /\{@attach scrollable\}/,
			allowed: {}
		},
		{
			name: 'an animation-frame loop',
			use: 'FrameLoop',
			pattern: /requestAnimationFrame/,
			allowed: {}
		},
		{
			name: "toLocaleString('en-US')",
			use: 'formatCount',
			pattern: /toLocaleString\('en-US'\)/,
			allowed: {}
		}
	];

describe('chapter widgets use the common components', () => {
	for (const { name, use, pattern, allowed } of PATTERNS) {
		it(`write ${name} only where ${use} doesn't fit`, () => {
			const found = widgets.filter((w) => pattern.test(w.source)).map((w) => w.file);
			expect(found.sort(), `use ${use}, or add an exception with its reason`).toEqual(
				Object.keys(allowed).sort()
			);
		});
	}
});
