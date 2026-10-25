# The guessing game

**Question:** Finish this sentence: _The cat sat on the ___._

**Key idea:** A large language model predicts the next piece of text. It doesn't pick one answer: it
gives every possible continuation a probability, and to write more it adds a pick to the text and
predicts again, over and over.

## Widgets

- `GuessTheWord`: the visitor types a guess and sees where it falls in GPT-2 small's top 50 for the
  prompt (rank and probability), with the candidates fanning out from the blank (`NextWordFan`).
- `RecordedGeneration`: replays GPT-2 continuing the prompt one token at a time: predict, pick,
  append.

## Data

Recorded GPT-2 small (`the-cat-sat` trace).

## Decisions

- No "what other people guessed" cloud: there is no real survey data, and made-up crowd data would
  read as fact. The visitor's guess is compared with the model's instead.
- Live with the Small model tier ([downloads.md](../downloads.md#widgets)): `GuessTheWord` asks
  GPT-2 small (8-bit) for its top 50, and takes the start of the visitor's own sentence.
- [Levels](../levels.md): Simple shortens Shannon's experiment and the model's spread of bets. In
  depth writes the game as the chain rule (a text's chance is its tokens' chances multiplied),
  works it on the recorded run, and introduces entropy with Shannon's estimate for English.
