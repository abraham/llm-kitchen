"""Fixtures for the recording runtime's tests: every path in a temporary folder, fixed package
versions and model commits, and a tiny GPT-2 built here, so no test downloads a model."""

from __future__ import annotations

import os

os.environ["HF_HUB_OFFLINE"] = "1"

import pytest

from scripts.record import common, runtime

REVISION = "a" * 40
VERSIONS = {"torch": "1.0", "transformers": "2.0"}


@pytest.fixture(autouse=True)
def isolated(tmp_path, monkeypatch):
    for name in ("CACHE", "PENDING", "GRADES", "SCRATCH", "LOGS"):
        monkeypatch.setattr(runtime, name, tmp_path / name.lower())
    monkeypatch.setattr(runtime, "USED", tmp_path / "cache" / "used")
    monkeypatch.setattr(common, "DATA", tmp_path / "data")
    monkeypatch.setattr(common, "OUTPUT", tmp_path / "data")
    monkeypatch.setattr(runtime, "SETTINGS", runtime.Settings())
    monkeypatch.setattr(runtime, "_revision", lambda model_id: REVISION)
    monkeypatch.setattr(runtime, "_versions", lambda: dict(VERSIONS))
    monkeypatch.setattr(runtime, "JOBS", {})
    monkeypatch.setattr(runtime, "_CURRENT", None)
    return tmp_path


@pytest.fixture(scope="session")
def tiny(tmp_path_factory) -> runtime.ModelSpec:
    """A one-layer GPT-2 with a ten-word vocabulary, randomly initialized with a fixed seed."""
    import torch
    from tokenizers import Tokenizer, models, pre_tokenizers
    from transformers import GPT2Config, GPT2LMHeadModel, PreTrainedTokenizerFast

    folder = tmp_path_factory.mktemp("tiny")
    words = ["<eos>", "<unk>", "the", "cat", "sat", "on", "mat", "a", "dog", "ran"]
    tok = Tokenizer(models.WordLevel({w: i for i, w in enumerate(words)}, unk_token="<unk>"))
    tok.pre_tokenizer = pre_tokenizers.WhitespaceSplit()
    PreTrainedTokenizerFast(tokenizer_object=tok, eos_token="<eos>", unk_token="<unk>").save_pretrained(folder)
    torch.manual_seed(0)
    config = GPT2Config(vocab_size=len(words), n_positions=32, n_embd=8, n_layer=1, n_head=2, eos_token_id=0)
    GPT2LMHeadModel(config).save_pretrained(folder)
    return runtime.ModelSpec(str(folder), "tiny")
