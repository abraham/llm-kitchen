import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const dir = 'src/lib/chapters';

describe('chapter markup', () => {
	it('never starts a line with an inline component (markdown would split it into its own block)', () => {
		for (const file of readdirSync(dir, { recursive: true, encoding: 'utf8' }).filter((f) =>
			f.endsWith('.svx')
		)) {
			readFileSync(`${dir}/${file}`, 'utf8')
				.split('\n')
				.forEach((line, i) => {
					expect(line, `${file}:${i + 1}`).not.toMatch(/^\s*<(GlossaryPopover|Cite|ChapterRef)\b/);
				});
		}
	});
});
