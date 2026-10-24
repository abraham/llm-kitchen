# Choosing actions

**Question:** An agent picks actions by writing text. Could a model predict the actions directly?

**Key idea:** A run of a game becomes a sequence of tokens: the reward still to earn, the cell the
player is in, and the move it makes, step after step. A small transformer trained on recorded runs
predicts the next move the way GPT-2 predicts the next word. You choose the score to aim for, and
the model plays like the runs that earned it: a Decision Transformer. It can't beat the best run it
saw. Reinforcement learning instead learns by trial and error from rewards, and the agent loop has
a language model describe an action in text for the harness to carry out.

## Widgets

- `DecisionGrid`: a 5 by 5 grid world (start, flag, three pits). A slider sets the target score;
  the model plays step by step in the browser (Step, Play, Start over), with the path on the grid,
  the model's probability for each move, and the (still to earn, cell, move) tokens as a strip of
  chips. A small histogram shows how many training runs scored each total, so targets outside the
  data stand out.

## Data

`scripts/record/decisions.py` generates 4,000 runs from random and scripted players, trains a tiny
transformer offline (seeded, one CPU thread), and writes the world, a summary of the runs, and the
rounded weights to `static/data/decisions/grid.json`. The browser runs the same network
(`src/lib/math/decision.ts`), and a test checks it makes the same moves as the script. Labeled as a
toy; the badge says computed in the browser.

## Decisions

- Each move costs 1 so that the score says how fast the player was: targets from 4 to 12 come out
  exact, and the best possible score is 12.
- Real behavior is kept, including the odd parts: low targets walk into a pit on purpose, and
  targets no run scored (−11 to 3) either run out of moves or reach the flag on the last move.
- The whole run fits the context (48 tokens), so the toy doesn't need the paper's window of recent
  steps.
- [Levels](../levels.md): Simple keeps to "it copies runs that scored what you asked". In depth
  shows the token layout and the network's size, the return-to-go arithmetic, and why a model
  trained on mostly bad runs can still aim high but not higher than its data.
