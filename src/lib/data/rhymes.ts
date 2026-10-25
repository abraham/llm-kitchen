/**
 * Traditional nursery rhymes (public domain). Wording varies between printed versions; these
 * are common modern forms. Used by the bigram model (`predicting-by-counting`), the tiny trainer (`learning-from-mistakes`), and the
 * agent demos (Agents and Safety).
 */
export const RHYMES = [
	{
		title: 'Mary Had a Little Lamb',
		text: 'Mary had a little lamb, its fleece was white as snow; and everywhere that Mary went, the lamb was sure to go.'
	},
	{
		title: 'Hey Diddle Diddle',
		text: 'Hey diddle diddle, the cat and the fiddle, the cow jumped over the moon; the little dog laughed to see such sport, and the dish ran away with the spoon.'
	},
	{
		title: 'Jack and Jill',
		text: 'Jack and Jill went up the hill to fetch a pail of water; Jack fell down and broke his crown, and Jill came tumbling after.'
	},
	{
		title: 'Humpty Dumpty',
		text: "Humpty Dumpty sat on a wall, Humpty Dumpty had a great fall; all the king's horses and all the king's men couldn't put Humpty together again."
	},
	{
		title: 'Twinkle, Twinkle, Little Star',
		text: 'Twinkle, twinkle, little star, how I wonder what you are! Up above the world so high, like a diamond in the sky.'
	},
	{
		title: 'Hickory Dickory Dock',
		text: 'Hickory dickory dock, the mouse ran up the clock; the clock struck one, the mouse ran down, hickory dickory dock.'
	}
] as const;
