/**
 * A choice made in the app bar, kept as a data attribute on <html> and in localStorage under
 * `llm-kitchen:<name>`. The inline script in app.html applies saved ones before the page paints.
 * The default choice is saved as nothing. Browser only.
 */
type Name = 'theme' | 'level';

/** The choice the inline script applied, if any. */
export function appliedChoice(name: Name): string | undefined {
	return globalThis.document.documentElement.dataset[name];
}

/** Applies a choice and saves it; undefined (the default) clears both. */
export function applyChoice(name: Name, value: string | undefined) {
	const root = globalThis.document.documentElement;
	if (value === undefined) delete root.dataset[name];
	else root.dataset[name] = value;
	try {
		if (value === undefined) globalThis.localStorage?.removeItem(`llm-kitchen:${name}`);
		else globalThis.localStorage?.setItem(`llm-kitchen:${name}`, value);
	} catch {
		// Storage can be unavailable (private mode, quota); the choice lasts for this page only.
	}
}
