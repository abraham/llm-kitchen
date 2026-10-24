// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	interface ImportMetaEnv {
		/** Set for the end-to-end build: adds the test-only pages in tests/e2e/fixtures. */
		readonly VITE_FIXTURES?: string;
	}

	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
