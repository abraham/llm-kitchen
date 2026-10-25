# A neuron

**Question:** A model turns token vectors into a chance for every next token. What is that
calculation made of?

**Key idea:** A language model is a calculation between the vectors of Part II and the
probabilities of Part I, and much of it is done by neurons. A neuron multiplies each input by a
weight, adds them up with a bias, and squashes the result: a small detector for one mix of its
inputs. Layers of many neurons, stacked, can pick out complicated patterns; GPT-2 small has a layer
of 3,072 in each of its 12 blocks, after attention. Nobody could set all those weights by hand,
which leads to the next chapter.

## Widgets

- `NeuronPlayground`: sliders for the weights and bias of one neuron; inputs flow along wires,
  scaled by their weights, summed, and passed through the activation function.
- `LayerPlayground`: three neurons plus an output neuron over an input plane (−2 to 2 on both
  axes) fence off a triangle, where one neuron alone can only draw an edge. Without an activation,
  stacked neurons would only draw straight lines.

## Data

Computed in the browser. The activation is ReLU; the text notes that GPT-2 uses GELU, a smooth
cousin.

## Decisions

- The chapter opens Part III by naming its two questions (what the calculation is made of, and
  where its numbers come from) and closes by handing the second one to
  [Learning from mistakes](learning-from-mistakes.md). Readers found the Part confusing when the
  neuron arrived without saying where it sits in a model.
- "Where neurons sit in a model" lists GPT-2's path (vectors, 12 blocks of attention and neurons,
  next-token chances) and points ahead to [Attention](attention.md) and
  [The transformer block](the-transformer-block.md), so the widgets' two abstract inputs read as a
  drawable stand-in for 768.
- [Levels](../levels.md): Simple describes the three steps in a paragraph and drops the history and
  GPT-2's sizes beyond 3,072 neurons per block. In depth writes the neuron and a layer as formulas,
  shows why two layers without a squash collapse into one, and gives GPT-2's MLP with its share of
  the weights and the GELU formula.
