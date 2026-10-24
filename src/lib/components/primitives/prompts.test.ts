import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import ChatLog from './ChatLog.svelte';
import PromptText from './PromptText.svelte';
import RoleKey from './RoleKey.svelte';
import { roleStyle, roleSwatch } from './roles.ts';

const parts = [
	{ text: '<|im_start|>user\n', kind: 'marker' },
	{ text: 'Hi', kind: 'user' }
] as const;

describe('roles', () => {
	it('gives each role its concept color', () => {
		expect(roleStyle('marker')).toBe('color: var(--c-token-ink); background: var(--c-token-tint)');
		expect(roleStyle('attack')).toBe('color: var(--c-loss-ink); background: var(--c-loss-tint)');
		expect(roleStyle('tools')).toContain('font-style: italic');
	});

	it('draws a swatch in the background color when there is one', () => {
		expect(roleSwatch('document')).toBe(
			'background: var(--c-vector-tint); box-shadow: inset 0 0 0 1px var(--c-vector)'
		);
		expect(roleSwatch('call')).toBe('background: var(--c-harness-ink)');
	});
});

describe('PromptText', () => {
	it('is a named region with each part in its role color', () => {
		const { body } = render(PromptText, { props: { parts, label: 'The prompt' } });
		expect(body).toMatch(/<pre[^>]* role="region"[^>]* aria-label="The prompt"/);
		expect(body).toContain(`style="${roleStyle('user')}"`);
		expect(body).toContain('data-role="user"');
		expect(body).toContain('>Hi</span>');
		expect(body).not.toContain('tabindex');
	});

	it('drops colors and emphasis when plain', () => {
		const { body } = render(PromptText, {
			props: { parts, label: 'The prompt', plain: true, emphasis: ['user'] }
		});
		expect(body).not.toContain('style="color');
		expect(body).not.toContain('strong');
	});
});

describe('ChatLog', () => {
	it('names who wrote each message in text', () => {
		const { body } = render(ChatLog, {
			props: {
				label: 'The chat',
				messages: [
					{ role: 'user', content: 'Hi' },
					{ role: 'assistant', content: 'Hello' }
				]
			}
		});
		expect(body).toMatch(/<ol[^>]* aria-label="The chat"/);
		expect(body).toMatch(/>You<\/span>Hi<\/li>/);
		expect(body).toMatch(/>Assistant<\/span>Hello<\/li>/);
	});
});

describe('RoleKey', () => {
	it('lists each role with its label and dims the ones not shown yet', () => {
		const { body } = render(RoleKey, {
			props: {
				roles: [
					{ kind: 'marker', label: 'chat markers' },
					{ kind: 'call', label: 'tool call', off: true }
				]
			}
		});
		expect(body).toContain('chat markers');
		expect(body.match(/<li[^>]*>/g)!.map((li) => li.includes('off'))).toEqual([false, true]);
	});
});
