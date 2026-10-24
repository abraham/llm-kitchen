import { defineConfig, devices } from '@playwright/test';
import e2e from './playwright.config.ts';

/** Chrome DevTools port that Lighthouse uses to drive Playwright's Chromium. */
export const DEBUG_PORT = 9222;

/**
 * Lighthouse (simulated mobile) on every page, against the Firebase Hosting emulator like the e2e
 * suite. One page at a time, since Lighthouse's timings suffer when pages compete for the CPU.
 */
export default defineConfig({
	testDir: 'tests/lighthouse',
	testMatch: '**/*.lh.ts',
	// Lets CI shards split the pages; each shard still runs them one at a time.
	fullyParallel: true,
	workers: 1,
	timeout: 120_000,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 1 : 0,
	reporter: process.env.CI
		? [['github'], ['html', { open: 'never', outputFolder: 'lighthouse-report' }]]
		: 'list',
	use: {
		baseURL: e2e.use?.baseURL,
		launchOptions: { args: [`--remote-debugging-port=${DEBUG_PORT}`] }
	},
	projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], channel: 'chromium' } }],
	webServer: e2e.webServer
});
