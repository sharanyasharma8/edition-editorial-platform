import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000";

export default defineConfig({
	testDir: "./tests/e2e",
	fullyParallel: false,
	workers: 1,
	retries: process.env.CI ? 1 : 0,
	reporter: process.env.CI ? "github" : "list",
	use: { baseURL, trace: "retain-on-failure", screenshot: "only-on-failure" },
	projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
	...(process.env.E2E_BASE_URL ? {} : {
		webServer: {
			command: "node .next/standalone/server.js",
			url: baseURL,
			reuseExistingServer: !process.env.CI,
			timeout: 120_000,
		},
	}),
});
