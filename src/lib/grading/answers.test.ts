import { describe, expect, it } from 'vitest';
import {
	answerVerdict,
	finalNumber,
	lastNumberIs,
	matchesAccepted,
	namesAnswer,
	numbersIn
} from './answers.ts';

describe('matchesAccepted', () => {
	it('matches whole words in any case, and whole numbers ignoring thousands separators', () => {
		expect(matchesAccepted('It is canberra.', ['Canberra'])).toBe(true);
		expect(matchesAccepted('Leonardo da Vinci', ['da Vinci'])).toBe(true);
		expect(matchesAccepted('Austens', ['Austen'])).toBe(false);
		expect(matchesAccepted('1,945', ['1945'])).toBe(true);
		expect(matchesAccepted('19450', ['1945'])).toBe(false);
		expect(matchesAccepted('six sides', ['6', 'six'])).toBe(true);
	});

	it('treats accented letters as part of a word, as Python does', () => {
		expect(matchesAccepted('Brontë', ['Bront'])).toBe(false);
	});
});

describe('answerVerdict', () => {
	it('declines before it grades', () => {
		expect(answerVerdict("I don't know.", ['Heaney'])).toBe('declined');
		expect(answerVerdict('I’m sorry, Heaney?', ['Heaney'])).toBe('declined');
		expect(answerVerdict('Seamus Heaney', ['Heaney'])).toBe('right');
		expect(answerVerdict('Saul Bellow', ['Heaney'])).toBe('wrong');
		expect(answerVerdict('Helen Macdonald', [])).toBe('wrong');
	});
});

describe('numbers', () => {
	it('reads the last number, or the one after the last "Answer:"', () => {
		expect(numbersIn('1,786 and -3')).toEqual(['1786', '-3']);
		expect(lastNumberIs('47 × 38 = 1,786', 1786)).toBe(true);
		expect(lastNumberIs('1786, I think, or 1787', 1786)).toBe(false);
		expect(finalNumber('Answer: $17, since 3 + 14')).toBe('17');
		expect(finalNumber('so \\boxed{63}')).toBe('63');
		expect(finalNumber('no idea')).toBeNull();
	});
});

describe('namesAnswer', () => {
	it('drops a leading "the" from the right answer', () => {
		expect(namesAnswer('It is the Pacific Ocean.', 'the Pacific')).toBe(true);
		expect(namesAnswer('The Atlantic.', 'the Pacific')).toBe(false);
	});
});
