import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import Choice from './Choice.svelte';
import Slider from './Slider.svelte';
import Toggle from './Toggle.svelte';

const options = [
	{ value: 1, label: 'One' },
	{ value: 2, label: 'Two' }
];

/** Every `<tag ...>` start tag in `html`. */
const tags = (html: string, tag: string) => html.match(new RegExp(`<${tag}\\b[^>]*>`, 'g')) ?? [];
const attr = (tag: string | undefined, name: string) =>
	tag?.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1];

describe('Choice', () => {
	it('renders one radio group, named by its legend, with the value checked', () => {
		const { body } = render(Choice, { props: { legend: 'Count', options, value: 2 } });
		expect(body).toMatch(/<fieldset[^>]*>\s*<legend[^>]*>Count<\/legend>/);
		const radios = tags(body, 'input');
		expect(radios.map((r) => attr(r, 'type'))).toEqual(['radio', 'radio']);
		expect(new Set(radios.map((r) => attr(r, 'name'))).size).toBe(1);
		expect(attr(radios[0], 'name')).toBeTruthy();
		expect(radios.map((r) => / checked/.test(r))).toEqual([false, true]);
	});

	it('renders a select whose label points at it, with the value selected', () => {
		const { body } = render(Choice, {
			props: { legend: 'Count', options, value: 2, appearance: 'select' }
		});
		const [label] = tags(body, 'label');
		const [select] = tags(body, 'select');
		expect(attr(label, 'for')).toBe(attr(select, 'id'));
		expect(tags(body, 'option').map((o) => / selected/.test(o))).toEqual([false, true]);
	});

	it('keeps a hidden name for assistive tech', () => {
		const { body } = render(Choice, {
			props: { legend: 'Count', options, value: 1, hideLabel: true }
		});
		expect(body).toMatch(/<legend class="[^"]*visually-hidden[^"]*">Count<\/legend>/);
	});
});

describe('Slider', () => {
	it('labels the range, shows the formatted value, and announces it', () => {
		const { body } = render(Slider, {
			props: {
				label: 'Temperature',
				value: 0.5,
				min: 0,
				max: 2,
				format: (v: number) => v.toFixed(2)
			}
		});
		const [label] = tags(body, 'label');
		const [input] = tags(body, 'input');
		expect(attr(label, 'for')).toBe(attr(input, 'id'));
		expect(attr(input, 'type')).toBe('range');
		expect(attr(input, 'value')).toBe('0.5');
		expect(attr(input, 'aria-valuetext')).toBe('0.50');
		expect(body).toContain('>0.50</span>');
	});

	it('leaves aria-valuetext off when the readout is the plain number', () => {
		const { body } = render(Slider, { props: { label: 'Patch', value: 3, min: 0, max: 9 } });
		expect(attr(tags(body, 'input')[0], 'aria-valuetext')).toBeUndefined();
	});

	it('colors the track by concept', () => {
		const { body } = render(Slider, {
			props: { label: 'Weight', value: 0, min: -1, max: 1, concept: 'weight' }
		});
		expect(body).toContain('--accent: var(--c-weight)');
	});
});

describe('Toggle', () => {
	it('is a labeled checkbox', () => {
		const { body } = render(Toggle, { props: { label: 'Show raw text', checked: true } });
		expect(body).toMatch(
			/<label[^>]*><input type="checkbox"[^>]* checked[^>]*\/?> Show raw text<\/label>/
		);
	});
});
