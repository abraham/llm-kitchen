import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	testDir: '.',
	testMatch: ['tests/e2e/**/*.e2e.ts', 'src/**/*.e2e.ts'],
	// Tests are independent, so CI shards and local workers can split even one file's tests.
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 1 : 0,
	reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
	use: { baseURL: 'http://localhost:4173' },
	projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
	// The Firebase Hosting emulator applies firebase.json (clean URLs, 404 page, headers) like production.
	// CI builds in its own step first, so a build failure shows up there.
	webServer: {
		command: process.env.CI ? 'npm run serve' : 'npm run build && npm run serve',
		url: 'http://localhost:4173',
		reuseExistingServer: !process.env.CI
	}
});
