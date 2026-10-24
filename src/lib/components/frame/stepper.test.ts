import { describe, expect, it } from 'vitest';
import { Stepper } from './stepper.svelte.ts';

describe('Stepper', () => {
	it('clamps to the available steps', () => {
		const s = new Stepper(3);
		s.prev();
		expect(s.index).toBe(0);
		s.go(10);
		expect(s.index).toBe(2);
		expect(s.atEnd).toBe(true);
	});

	it('handles arrow, Home, and End keys', () => {
		const s = new Stepper(4);
		expect(s.handleKey('ArrowRight')).toBe(true);
		expect(s.index).toBe(1);
		s.handleKey('End');
		expect(s.index).toBe(3);
		s.handleKey('ArrowLeft');
		expect(s.index).toBe(2);
		s.handleKey('Home');
		expect(s.atStart).toBe(true);
		expect(s.handleKey('a')).toBe(false);
	});

	it('rejects an empty stepper', () => {
		expect(() => new Stepper(0)).toThrow();
	});
});
