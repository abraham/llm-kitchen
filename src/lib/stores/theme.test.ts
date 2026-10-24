import { describe, expect, it } from 'vitest';
import { parseTheme } from './theme.svelte.ts';

describe('parseTheme', () => {
	it('keeps light and dark, and ignores anything else in storage', () => {
		expect(parseTheme('light')).toBe('light');
		expect(parseTheme('dark')).toBe('dark');
		for (const raw of ['Dark', 'system', '"dark"', '', null, undefined]) {
			expect(parseTheme(raw), String(raw)).toBeNull();
		}
	});
});
