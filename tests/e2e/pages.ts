import { CURRICULUM } from '../../src/lib/curriculum/index.ts';

/** Every page on the site: the menu, all chapters, and the Models page. */
export const PAGES = ['/', ...CURRICULUM.map((c) => `/${c.slug}`), '/downloads'];

/** An address with no page, which hosting answers with the 404 page. */
export const NOT_FOUND = '/not-a-page';
