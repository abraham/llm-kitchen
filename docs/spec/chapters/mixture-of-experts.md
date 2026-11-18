# Many experts

**Question:** Every one of GPT-2's weights works on every token. Could a model be huge but use only
part of itself for each token?

**Key idea:** A mixture-of-experts model splits each block's MLP into many experts, and a router
sends each token to only a few of them, so the model can hold far more weights than it uses for any
one token (Mixtral 8x7B uses 13 of its 47 billion). Every expert still has to be stored: when memory
is short, the rest can wait on flash and be read when picked, and how often the needed expert is
already in memory sets the speed. Experts aren't neat topic specialists; the router learns its own
way of dividing the work.

## Widgets

- `ExpertRouter`: the tokens of a sentence pass through a block whose MLP is split into experts. A
  router scores the experts for each token and sends it to the top few (2 by default), and the
  visitor sees where each token went and the count of total vs. active weights.

## Data

- Real figures (Mixtral 8x7B, DeepSeek-V3, and Mixtral's 32 blocks of 8 experts) in
  `src/lib/chapters/mixture-of-experts/data.ts`, cited.
- Routing is a computed toy router (`src/lib/math/router.ts`) over GPT-2's token vectors, labeled
  as simplified.

## Decisions

- A toy router instead of recorded routing: recording a real mixture-of-experts model (several GB)
  wasn't practical on the available disk.
- Too big to fit is prose, not a widget: offloading experts is described with Eliseev and Mazur's
  Mixtral results, and smolmaxxing (a hobby project, cited with an accessed date) is the measured
  small-device example: Ling-mini-2.0 on a 2 GB TV box, and the quality cost of cache-aware routing.
- [Levels](../levels.md): Simple keeps the active-weight counts and the idea of keeping some experts
  on storage. In depth writes out the router, works out how much of Mixtral is shared, explains load
  balancing, and works out how much Mixtral must keep in memory and read per token.
