/**
 * Checks that a deployed site serves the headers firebase.json configures, since the Hosting
 * emulator can't show what the CDN adds or overrides (such as HSTS). Exits 1 on any mismatch.
 *
 *   node scripts/check-live-headers.ts https://llm.kitchen
 */
import { readFileSync, readdirSync } from 'node:fs';

interface HeaderRule {
	source: string;
	headers: { key: string; value: string }[];
}

const origin = process.argv[2];
if (!origin) throw new Error('Usage: node scripts/check-live-headers.ts <origin>');

const rules = (
	JSON.parse(readFileSync('firebase.json', 'utf8')) as { hosting: { headers: HeaderRule[] } }
).hosting.headers;
const rule = (source: string) => rules.find((r) => r.source === source)!.headers;
const worker = readdirSync('build/_app/immutable/workers').find((f) => f.startsWith('inference.'));

// Later rules win for the same key, as on Hosting.
const checks: [string, HeaderRule['headers']][] = [
	['/', rule('**')],
	[
		`/_app/immutable/workers/${worker}`,
		[
			...rule('**'),
			...rule('/_app/immutable/**'),
			...rule('/_app/immutable/workers/**'),
			...rule('/_app/immutable/workers/inference.worker-*.js')
		]
	]
];

let failed = false;
for (const [path, expected] of checks) {
	const response = await fetch(new URL(path, origin), { method: 'HEAD' });
	const want = new Map(expected.map((h) => [h.key.toLowerCase(), h.value]));
	for (const [key, value] of want) {
		const got = response.headers.get(key);
		if (got !== value) {
			failed = true;
			console.error(`${path}: ${key}\n  expected ${value}\n  got      ${got}`);
		}
	}
}
if (failed) process.exit(1);
console.log(`${origin} serves the configured headers.`);
