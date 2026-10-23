import { defineConfig, devices } from '@playwright/test';

/**
 * Screenshot comparisons, run locally with `npm run test:visual` (update with
 * `npm run test:visual -- --update-snapshots`). Baselines are per platform, so CI doesn't run
 * these; the e2e suite covers behavior and accessibility there.
 */
export default defineConfig({
	testDir: 'tests/visual',
	testMatch: '**/*.visual.ts',
	reporter: 'list',
	use: { baseURL: 'http://localhost:4173' },
	expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.001, animations: 'disabled' } },
	projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
	webServer: {
		command: 'npm run build && npm run preview -- --port 4173 --strictPort',
		port: 4173,
		reuseExistingServer: true
	}
});
