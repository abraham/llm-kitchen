// Checks that the numbers and examples in the Part I prose match the data the widgets show.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import canonical from '../../models/canonical.json';
import { RHYMES } from '../../src/lib/data/rhymes.ts';
import { bigramCounts, words } from '../../src/lib/math/bigram.ts';
import { encodeText } from '../../src/lib/math/encoding.ts';
import { parseTrace } from '../../src/lib/models/trace.ts';

const trace = (name: string) =>
	parseTrace(JSON.parse(readFileSync(`static/traces/${canonical.id}/${name}.json`, 'utf8')));

describe('Ch 0: the guessing game', () => {
	const first = trace('the-cat-sat').steps[0];

	it('"floor, bed, and couch are all likely" (the top three)', () => {
		expect(first.candidates.slice(0, 3).map((c) => c.token.text.trim())).toEqual([
			'floor',
			'bed',
			'couch'
		]);
	});

	it('"no single option gets even one chance in ten"', () => {
		expect(first.candidates[0].prob).toBeLessThan(0.1);
	});

	it('shows 4 rounds of generation, which exist in the trace', () => {
		expect(trace('the-cat-sat').steps.length).toBeGreaterThanOrEqual(4);
	});
});

describe('Ch 1: text is just numbers', () => {
	const cp = (s: string) => encodeText(s)[0].codePoint;

	it('"T is 84, h is 104, a space is 32, é is 233, 🐱 is 128,049"', () => {
		expect([cp('T'), cp('h'), cp(' '), cp('é'), cp('🐱')]).toEqual([84, 104, 32, 233, 128049]);
	});

	it('"room for more than a million characters" (U+0000 to U+10FFFF)', () => {
		expect(0x10ffff + 1).toBeGreaterThan(1_000_000);
	});
});

describe('Ch 2: predicting by counting', () => {
	const counts = bigramCounts(RHYMES.map((r) => r.text));

	it('"little was followed by lamb, dog, and star once each"', () => {
		expect(counts.little).toEqual({ lamb: 1, dog: 1, star: 1 });
	});

	it('the wandering example only uses pairs from the rhymes', () => {
		const example = words('the cow jumped over the clock struck one, the lamb was sure to go');
		for (let i = 0; i + 1 < example.length; i++) {
			expect(
				counts[example[i]]?.[example[i + 1]],
				`${example[i]} → ${example[i + 1]}`
			).toBeGreaterThan(0);
		}
	});

	it('"six nursery rhymes"', () => {
		expect(RHYMES).toHaveLength(6);
	});

	it('"the" is followed by words from the cow, mouse, and lamb rhymes', () => {
		expect(Object.keys(counts.the)).toEqual(expect.arrayContaining(['cow', 'mouse', 'lamb']));
	});
});

describe('Ch 3: probability and sampling', () => {
	it('"the real model chooses from all 50,257 options"', () => {
		expect(canonical.vocabularySize).toBe(50257);
	});

	it('"16 more pieces of text, at three temperatures"', () => {
		for (const name of ['the-cat-sat-t00', 'the-cat-sat-t07', 'the-cat-sat-t15']) {
			expect(trace(name).steps).toHaveLength(16);
		}
		expect(trace('the-cat-sat-t07').settings?.temperature).toBe(0.7);
		expect(trace('the-cat-sat-t15').settings?.temperature).toBe(1.5);
	});

	it('the widget has GPT-2’s ten most likely next words to show', () => {
		expect(trace('the-cat-sat').steps[0].candidates.length).toBeGreaterThanOrEqual(10);
	});
});
