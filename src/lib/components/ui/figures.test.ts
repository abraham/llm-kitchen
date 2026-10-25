import { createRawSnippet } from 'svelte';
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import { scaleLinear } from '#lib/math/scale.ts';
import Axis from './Axis.svelte';
import Figure from './Figure.svelte';
import FigureData from './FigureData.svelte';

const raw = (html: string) => createRawSnippet(() => ({ render: () => html }));

describe('Figure', () => {
	it('is an image named by its label, drawn at its starting width with a fixed height', () => {
		const { body } = render(Figure, {
			props: { label: 'A curve', width: 480, max: 600, height: 200, children: raw('<path></path>') }
		});
		expect(body).toMatch(/<svg[^>]* viewBox="0 0 480 200"/);
		expect(body).toMatch(/<svg[^>]* role="img"[^>]* aria-label="A curve"/);
		expect(body).toContain('height: 200px');
		expect(body).toContain('max-width: 600px');
		expect(body).toContain('<path></path>');
	});

	it('scales a fixed drawing and sets the minimum text size for it', () => {
		const { body } = render(Figure, {
			props: {
				label: 'A diagram',
				viewBox: [420, 200],
				maxWidth: '20rem',
				children: raw('<g></g>')
			}
		});
		expect(body).toMatch(/viewBox="0 0 420 200"/);
		expect(body).toContain('max-width: 20rem');
		// Unmeasured while prerendering: one drawing unit per pixel.
		expect(body).toContain('--min-text: 11px');
	});
});

describe('Axis', () => {
	it('draws ticks, gridlines, and a title from its scale', () => {
		const scale = scaleLinear([0, 10], [0, 100]);
		const { body } = render(Axis, {
			props: { scale, side: 'bottom', at: 80, grid: 0, ticks: [0, 5, 10], label: 'Steps' }
		});
		expect(body.match(/class="grid/g)).toHaveLength(3);
		expect(body).toMatch(/<text x="50" y="96"[^>]*>5<\/text>/);
		expect(body).toMatch(/>Steps<\/text>/);
	});
});

describe('FigureData', () => {
	it('keeps the numbers in a closed disclosure', () => {
		const { body } = render(FigureData, { props: { children: raw('<table></table>') } });
		expect(body).toMatch(/<details[^>]*><summary[^>]*>The numbers<\/summary>/);
		expect(body).not.toMatch(/<details[^>]* open/);
		expect(body).toMatch(/role="region"[^>]* aria-label="The numbers"/);
	});
});
