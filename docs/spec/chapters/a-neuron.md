# A neuron

**Question:** The vectors are learned, but learned by what? What does the model do with all these
numbers?

**Key idea:** A neuron multiplies each input by a weight, adds them up with a bias, and squashes the
result. Weights say how much each input matters, and in which direction. Layers of many neurons,
stacked, can represent complicated patterns; GPT-2 small has 3,072 per block in its 12 blocks.

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

- [Levels](../levels.md): Simple describes the three steps in a paragraph and drops the history and
  GPT-2's sizes beyond 3,072 neurons per block. In depth writes the neuron and a layer as formulas,
  shows why two layers without a squash collapse into one, and gives GPT-2's MLP with its share of
  the weights and the GELU formula.
