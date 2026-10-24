"""Train the toy Decision Transformer for `decision-models` (computed, no downloaded model).

Usage:
    scripts/.venv/bin/python -m scripts.record decisions

Plays a small grid world with a mix of random and scripted players, trains a tiny transformer to
predict each move from the reward still to earn, the cell, and the step (Chen et al. 2021), and
writes static/data/decisions/grid.json: the world, a summary of the training runs, the weights
(rounded, so the browser runs exactly the same model), and greedy runs for a few targets that the
browser's forward pass is tested against. Seeded and run on one CPU thread, so reruns match. The
model has no download to pin, so its revision is the SHA-1 of this script, which sets every weight.
"""

from __future__ import annotations

import hashlib
import random
from collections import Counter, deque
from pathlib import Path

import torch
from torch import nn

from .common import write_dataset

SIZE = 5
START = (4, 0)
GOAL = (0, 4)
PITS = [(1, 1), (2, 3), (3, 1)]
MOVES = [("up", -1, 0), ("right", 0, 1), ("down", 1, 0), ("left", 0, -1)]
HORIZON = 16
STEP_REWARD = -1
GOAL_REWARD = 20
PIT_REWARD = -10
RETURN_SCALE = 20

RUNS = 4000
RANDOM_SHARE = 0.35
EPSILONS = (0.1, 0.7)

WIDTH = 24
LAYERS = 2
HEADS = 2
TRAIN_STEPS = 4000
BATCH = 128
DIGITS = 4
CHECK_TARGETS = [-16, -10, 0, 4, 8, 12, 20]


def cell(pos: tuple[int, int]) -> int:
    return pos[0] * SIZE + pos[1]


def move(pos: tuple[int, int], action: int) -> tuple[tuple[int, int], int, bool]:
    """The next cell, the reward for the move, and whether the run is over."""
    _, dr, dc = MOVES[action]
    r, c = pos[0] + dr, pos[1] + dc
    nxt = (r, c) if 0 <= r < SIZE and 0 <= c < SIZE else pos
    if nxt == GOAL:
        return nxt, STEP_REWARD + GOAL_REWARD, True
    if nxt in PITS:
        return nxt, STEP_REWARD + PIT_REWARD, True
    return nxt, STEP_REWARD, False


def distances() -> dict[tuple[int, int], int]:
    """Moves from each safe cell to the goal, avoiding pits."""
    dist = {GOAL: 0}
    queue = deque([GOAL])
    while queue:
        r, c = queue.popleft()
        for _, dr, dc in MOVES:
            p = (r - dr, c - dc)
            if 0 <= p[0] < SIZE and 0 <= p[1] < SIZE and p not in PITS and p not in dist:
                dist[p] = dist[(r, c)] + 1
                queue.append(p)
    return dist


DIST = distances()


def play(rng: random.Random, epsilon: float) -> dict:
    """One run: with probability epsilon a random move, otherwise a move that gets closer."""
    pos, states, actions, rewards = START, [], [], []
    for _ in range(HORIZON):
        good = [a for a in range(4) if DIST.get(move(pos, a)[0], 99) < DIST[pos]]
        action = rng.randrange(4) if rng.random() < epsilon else rng.choice(good)
        states.append(cell(pos))
        actions.append(action)
        pos, reward, done = move(pos, action)
        rewards.append(reward)
        if done:
            break
    return {"states": states, "actions": actions, "rewards": rewards, "end": cell(pos)}


def returns_to_go(rewards: list[int]) -> list[int]:
    out, total = [], sum(rewards)
    for r in rewards:
        out.append(total)
        total -= r
    return out


class Block(nn.Module):
    def __init__(self):
        super().__init__()
        self.ln1 = nn.LayerNorm(WIDTH)
        self.qkv = nn.Linear(WIDTH, 3 * WIDTH)
        self.proj = nn.Linear(WIDTH, WIDTH)
        self.ln2 = nn.LayerNorm(WIDTH)
        self.fc = nn.Linear(WIDTH, 4 * WIDTH)
        self.out = nn.Linear(4 * WIDTH, WIDTH)

    def forward(self, x):
        n, t, _ = x.shape
        q, k, v = self.qkv(self.ln1(x)).split(WIDTH, dim=2)
        heads = lambda m: m.view(n, t, HEADS, WIDTH // HEADS).transpose(1, 2)  # noqa: E731
        q, k, v = heads(q), heads(k), heads(v)
        scores = q @ k.transpose(-2, -1) / (WIDTH // HEADS) ** 0.5
        mask = torch.ones(t, t, dtype=torch.bool).tril()
        scores = scores.masked_fill(~mask, float("-inf"))
        mixed = (scores.softmax(-1) @ v).transpose(1, 2).reshape(n, t, WIDTH)
        x = x + self.proj(mixed)
        return x + self.out(torch.relu(self.fc(self.ln2(x))))


class DecisionTransformer(nn.Module):
    """Tokens (return to go, cell, move) per step, each plus its step's embedding."""

    def __init__(self):
        super().__init__()
        self.ret = nn.Linear(1, WIDTH)
        self.cell = nn.Embedding(SIZE * SIZE, WIDTH)
        self.move = nn.Embedding(4, WIDTH)
        self.step = nn.Embedding(HORIZON, WIDTH)
        self.ln_in = nn.LayerNorm(WIDTH)
        self.blocks = nn.ModuleList(Block() for _ in range(LAYERS))
        self.ln_out = nn.LayerNorm(WIDTH)
        self.head = nn.Linear(WIDTH, 4)

    def forward(self, rtg, cells, moves):
        """Scores for each step's move, read at that step's cell token."""
        n, t = cells.shape
        when = self.step(torch.arange(t)).unsqueeze(0)
        tokens = torch.stack(
            [self.ret(rtg.unsqueeze(-1) / RETURN_SCALE) + when, self.cell(cells) + when, self.move(moves) + when],
            dim=2,
        ).reshape(n, 3 * t, WIDTH)
        x = self.ln_in(tokens)
        for block in self.blocks:
            x = block(x)
        return self.head(self.ln_out(x)[:, 1::3])


def batch_of(runs: list[dict]):
    n = len(runs)
    rtg = torch.zeros(n, HORIZON)
    cells = torch.zeros(n, HORIZON, dtype=torch.long)
    moves = torch.zeros(n, HORIZON, dtype=torch.long)
    mask = torch.zeros(n, HORIZON, dtype=torch.bool)
    for i, run in enumerate(runs):
        t = len(run["actions"])
        rtg[i, :t] = torch.tensor(returns_to_go(run["rewards"]), dtype=torch.float)
        cells[i, :t] = torch.tensor(run["states"])
        moves[i, :t] = torch.tensor(run["actions"])
        mask[i, :t] = True
    return rtg, cells, moves, mask


def rollout(model: DecisionTransformer, target: int) -> dict:
    """Play greedily, aiming at `target`; subtract each reward from what is still to earn."""
    pos, rtg, cells, moves, rewards, first = START, [target], [cell(START)], [], [], None
    with torch.no_grad():
        for t in range(HORIZON):
            scores = model(
                torch.tensor([rtg], dtype=torch.float),
                torch.tensor([cells]),
                torch.tensor([moves + [0]]),
            )[0, t]
            if first is None:
                first = [round(float(s), 3) for s in scores]
            action = int(scores.argmax())
            moves.append(action)
            pos, reward, done = move(pos, action)
            rewards.append(reward)
            if done or t == HORIZON - 1:
                break
            rtg.append(rtg[-1] - reward)
            cells.append(cell(pos))
    return {"target": target, "actions": moves, "return": sum(rewards), "end": cell(pos), "firstScores": first}


def weights(model: DecisionTransformer) -> dict:
    """Every parameter, rounded, as nested lists in PyTorch's (out, in) layout."""

    def rounded(x):
        return [rounded(y) for y in x] if isinstance(x, list) else round(x, DIGITS)

    return {name: rounded(p.detach().tolist()) for name, p in model.state_dict().items()}


def main() -> None:
    torch.manual_seed(0)
    torch.set_num_threads(1)
    rng = random.Random(0)
    runs = []
    for _ in range(RUNS):
        kind = "random" if rng.random() < RANDOM_SHARE else "scripted"
        run = play(rng, 1.0 if kind == "random" else rng.uniform(*EPSILONS))
        run["player"] = kind
        runs.append(run)

    model = DecisionTransformer()
    optimizer = torch.optim.AdamW(model.parameters(), lr=1e-3, weight_decay=1e-4)
    for i in range(TRAIN_STEPS):
        rtg, cells, moves, mask = batch_of(rng.sample(runs, BATCH))
        scores = model(rtg, cells, moves)
        loss = nn.functional.cross_entropy(scores[mask], moves[mask])
        optimizer.zero_grad()
        loss.backward()
        optimizer.step()
        if i % 500 == 0 or i == TRAIN_STEPS - 1:
            print(f"step {i} loss {loss.item():.3f}")

    shipped = weights(model)
    model.load_state_dict({k: torch.tensor(v) for k, v in shipped.items()})
    model.eval()

    returns = Counter(sum(r["rewards"]) for r in runs)
    outcome = lambda r: "goal" if r["end"] == cell(GOAL) else "pit" if r["end"] in map(cell, PITS) else "time"  # noqa: E731
    summary = {
        "runs": RUNS,
        "byPlayer": dict(Counter(r["player"] for r in runs)),
        "byOutcome": dict(Counter(outcome(r) for r in runs)),
        "returns": {str(k): returns[k] for k in sorted(returns)},
        "steps": sum(len(r["actions"]) for r in runs),
    }
    checks = [rollout(model, t) for t in CHECK_TARGETS]
    for c in checks:
        print(c["target"], c["return"], c["actions"])
    print(summary)

    write_dataset(
        "decisions/grid",
        {
            "model": {"id": "llm-kitchen/toy-decision-transformer", "displayName": "Toy Decision Transformer", "revision": hashlib.sha1(Path(__file__).read_bytes()).hexdigest()},
            "world": {
                "size": SIZE,
                "start": cell(START),
                "goal": cell(GOAL),
                "pits": [cell(p) for p in PITS],
                "moves": [m[0] for m in MOVES],
                "horizon": HORIZON,
                "rewards": {"step": STEP_REWARD, "goal": GOAL_REWARD, "pit": PIT_REWARD},
            },
            "training": summary,
            "net": {
                "width": WIDTH,
                "layers": LAYERS,
                "heads": HEADS,
                "returnScale": RETURN_SCALE,
                "steps": TRAIN_STEPS,
                "finalLoss": round(loss.item(), 3),
                "weights": shipped,
            },
            "checks": checks,
        },
        "decisions",
        compact=True,
    )


if __name__ == "__main__":
    main()
