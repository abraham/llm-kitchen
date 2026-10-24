import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SITE_ORIGIN } from '#lib/site.ts';

const files = (dir: string, ext: RegExp) =>
	readdirSync(dir, { recursive: true, encoding: 'utf8' })
		.filter((f) => ext.test(f) && !/\.test\.ts$|\.e2e\.ts$/.test(f) && !f.includes('__pycache__'))
		.map((f) => ({ file: `${dir}/${f}`, source: readFileSync(`${dir}/${f}`, 'utf8') }));

const src = files('src', /\.(ts|js|svelte|svx)$/);
const recording = files('scripts/record', /\.py$/);
const workflows = files('.github/workflows', /\.ya?ml$/);

/** Every file whose source matches `pattern`, so a failure names them. */
const matching = (list: { file: string; source: string }[], pattern: RegExp) =>
	list.filter((f) => pattern.test(f.source)).map((f) => f.file);

describe('security rules (docs/spec/security.md)', () => {
	it('never renders raw HTML or evaluates strings as code', () => {
		expect(
			matching(
				src,
				/\{@html\b|\.(innerHTML|outerHTML)\b|insertAdjacentHTML|document\.write\(|\beval\(|new Function\(|setTimeout\(\s*['"`]/
			)
		).toEqual([]);
	});

	it('opens external links without giving the new page a handle on this one', () => {
		for (const { file, source } of src) {
			for (const tag of source.match(/<a\b[^>]*target="_blank"[^>]*>/g) ?? []) {
				expect(tag, file).toContain('rel="noopener noreferrer"');
			}
		}
	});

	it('never lets a model repository run code on the recording machine', () => {
		expect(matching(recording, /trust_remote_code|\bpickle\b|torch\.load/)).toEqual([]);
	});

	it('never runs workflows with write access for untrusted code', () => {
		expect(matching(workflows, /\b(pull_request_target|workflow_run)\b/)).toEqual([]);
	});

	it("never leaves the job's token in .git/config after checkout", () => {
		for (const { file, source } of workflows) {
			const checkouts = source.match(/uses: actions\/checkout@/g)?.length ?? 0;
			const dropped = source.match(/persist-credentials: false/g)?.length ?? 0;
			expect(dropped, file).toBe(checkouts);
		}
	});

	it('says how to report a problem in a security.txt that has not expired', () => {
		const fields = Object.fromEntries(
			readFileSync('static/security.txt', 'utf8')
				.trim()
				.split('\n')
				.map((line) => line.split(/: (.*)/s).slice(0, 2))
		);
		expect(fields.Contact).toMatch(/^https:\/\//);
		expect(fields.Canonical).toBe(`${SITE_ORIGIN}/.well-known/security.txt`);
		// RFC 9116 asks for an expiry under a year away; when this fails, move it forward.
		const days = (Date.parse(fields.Expires) - Date.now()) / 86_400_000;
		expect(days).toBeGreaterThan(0);
		expect(days).toBeLessThanOrEqual(366);
	});
});
