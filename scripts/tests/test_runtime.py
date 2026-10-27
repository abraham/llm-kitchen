"""The recording runtime: the cache key, cache hits and --fresh, hand grades, dependency order,
trials, the envelope, and the probe behind `status`."""

from __future__ import annotations

import json

import pytest

from scripts.record import common, runtime
from scripts.record.runtime import Job, ModelSpec, Run, job

from conftest import REVISION, VERSIONS

SPEC = ModelSpec("test/model", "Test model")
MODEL = {"id": SPEC.id, "displayName": SPEC.name, "revision": REVISION}


def counting():
    """A compute function that counts its calls and returns how many there have been."""
    calls: list[int] = []

    def compute() -> int:
        calls.append(1)
        return len(calls)

    return calls, compute


def bare_run(*outputs: str) -> Run:
    return Run(Job(outputs[0], "test", outputs, (), None, (), {}, False, lambda run: None))


# --- The cache key ---------------------------------------------------------------------------


def test_every_field_of_the_key_changes_it_and_key_order_does_not(monkeypatch):
    monkeypatch.setattr(runtime, "_device", lambda spec: spec.device)
    calls, compute = counting()
    inputs = {"ids": [1, 2], "max_new_tokens": 3}

    runtime._cached("generate", SPEC, inputs, compute)
    runtime._cached("generate", SPEC, {"max_new_tokens": 3, "ids": [1, 2]}, compute)
    # The display name and stop tokens don't change what the model computes.
    runtime._cached("generate", ModelSpec(SPEC.id, "Other name", stop=("<end>",)), inputs, compute)
    assert len(calls) == 1

    changed = [
        ("score", SPEC, inputs),
        ("generate", SPEC, {**inputs, "max_new_tokens": 4}),
        ("generate", ModelSpec("test/other", "Test model"), inputs),
        ("generate", ModelSpec(SPEC.id, SPEC.name, dtype="float16"), inputs),
        ("generate", ModelSpec(SPEC.id, SPEC.name, device="mps"), inputs),
        ("generate", ModelSpec(SPEC.id, SPEC.name, attention="eager"), inputs),
    ]
    for n, (call, spec, given) in enumerate(changed, start=2):
        runtime._cached(call, spec, given, compute)
        assert len(calls) == n, (call, spec, given)

    monkeypatch.setattr(runtime, "_revision", lambda model_id: "b" * 40)
    runtime._cached("generate", SPEC, inputs, compute)
    monkeypatch.setattr(runtime, "_versions", lambda: {**VERSIONS, "torch": "1.1"})
    runtime._cached("generate", SPEC, inputs, compute)
    assert len(calls) == len(changed) + 3


def test_fresh_computes_again_and_refreshes_the_entry():
    calls, compute = counting()
    assert runtime._cached("embed", SPEC, {"texts": ["a"]}, compute) == 1
    runtime.SETTINGS.fresh = True
    assert runtime._cached("embed", SPEC, {"texts": ["a"]}, compute) == 2
    runtime.SETTINGS.fresh = False
    assert runtime._cached("embed", SPEC, {"texts": ["a"]}, compute) == 2
    assert len(calls) == 2


def test_a_cached_generation_never_loads_the_model(tiny, monkeypatch):
    first = runtime.complete(tiny, "the cat sat", max_new_tokens=4)
    assert first["tokens"] <= 4

    def no_model(spec):
        raise AssertionError("the model was loaded for a cached call")

    monkeypatch.setattr(runtime, "loaded", no_model)
    assert runtime.complete(tiny, "the cat sat", max_new_tokens=4) == first


def test_a_sampled_call_depends_only_on_its_seed(tiny):
    settings = {"max_new_tokens": 6, "do_sample": True, "num_return_sequences": 3}
    a = runtime.generate(tiny, "the dog", seed=1, **settings)
    runtime.SETTINGS.fresh = True
    assert runtime.generate(tiny, "the dog", seed=1, **settings) == a


# --- Hand grades -----------------------------------------------------------------------------


def test_a_grade_holds_only_for_the_exact_text_it_was_given():
    run = bare_run("test/graded")
    assert run.grade("test/graded", "q1", "Paris.", ("right", "wrong")) == {"verdict": "ungraded", "reason": ""}
    assert run.ungraded[0]["hash"] == runtime.text_hash("Paris.")

    grade = {"label": "q1", "hash": runtime.text_hash("Paris."), "verdict": "right", "reason": "Says Paris."}
    runtime.save_grades("test/graded", [grade])
    run = bare_run("test/graded")
    assert run.grade("test/graded", "q1", "Paris.", ("right", "wrong")) == {"verdict": "right", "reason": "Says Paris."}
    assert run.ungraded == []

    # A changed reply is asked about again, with the grade it had before.
    assert run.grade("test/graded", "q1", "Lyon.", ("right", "wrong"))["verdict"] == "ungraded"
    assert run.ungraded[0]["earlier"] == grade

    with pytest.raises(SystemExit):
        run.grade("test/graded", "q1", "Paris.", ("yes", "no"))
    with pytest.raises(SystemExit):
        run.grade("test/other", "q1", "Paris.", ("right", "wrong"))


def test_a_run_with_ungraded_replies_writes_nothing_until_they_are_graded():
    @job("test/graded")
    def graded(run: Run) -> dict:
        return {"model": MODEL, **run.grade("test/graded", "q1", "Paris.", ("right", "wrong"))}

    declared = runtime.JOBS["test/graded"]
    with pytest.raises(SystemExit, match="grade test/graded"):
        runtime.run_job(declared)
    assert not common.dataset_file("test/graded", common.DATA).exists()
    assert runtime.pending_file("test/graded").exists()

    runtime.save_grades("test/graded", [{"label": "q1", "hash": runtime.text_hash("Paris."), "verdict": "right", "reason": "Says Paris."}])
    [path] = runtime.run_job(declared)
    assert json.loads(path.read_text())["data"]["verdict"] == "right"
    assert not runtime.pending_file("test/graded").exists()


# --- Order, trials, and the envelope ---------------------------------------------------------


def test_jobs_run_after_the_jobs_they_need():
    for name, needs in [("test/a", []), ("test/b", ["test/a"]), ("test/c", ["test/b"])]:
        job(name, needs=needs)(lambda run: None)
    assert [j.name for j in runtime.ordered(["test/c", "test/a", "test/b"])] == ["test/a", "test/b", "test/c"]
    # A needed job that wasn't asked for isn't run.
    assert [j.name for j in runtime.ordered(["test/c"])] == ["test/c"]
    with pytest.raises(SystemExit):
        runtime.ordered(["test/missing"])

    job("test/x", needs=["test/y"])(lambda run: None)
    job("test/y", needs=["test/x"])(lambda run: None)
    with pytest.raises(SystemExit, match="cycle"):
        runtime.ordered(["test/x", "test/y"])


def test_a_trial_writes_only_to_the_scratch_folder():
    job("test/trial", options={"n": 1})(lambda run: {"model": MODEL, "n": run.option("n")})
    runtime.SETTINGS.sets = {"n": 2}
    runtime.try_job(runtime.JOBS["test/trial"])

    [written] = runtime.SCRATCH.rglob("*.json")
    assert json.loads(written.read_text())["data"]["n"] == 2
    assert not common.DATA.exists()
    assert not runtime.USED.exists()
    assert common.OUTPUT == common.DATA


def test_the_envelope_names_the_job_versions_and_devices():
    @job("test/envelope", "test/second", models=[SPEC], compact=True)
    def envelope(run: Run) -> dict:
        runtime._cached("generate", SPEC, {"ids": [1]}, lambda: [2])
        run.write("test/second", {"model": MODEL, "part": 2})
        return {"model": MODEL, "part": 1}

    # Written in the order the job hands them over: run.write first, then what it returns.
    second, first = runtime.run_job(runtime.JOBS["test/envelope"])
    text = first.read_text()
    assert text.count("\n") == 1  # compact: one line
    head = json.loads(text)
    assert head["dataset"] == "test/envelope"
    assert head["script"] == "record/test_runtime.py"
    assert head["job"] == "test/envelope"
    assert head["source"] == VERSIONS
    assert head["models"] == [{"id": SPEC.id, "revision": REVISION, "device": "cpu", "dtype": "float32"}]
    assert json.loads(second.read_text())["data"]["part"] == 2


def test_data_must_name_its_model():
    with pytest.raises(SystemExit, match="name the model"):
        common.write_dataset("test/nameless", {"value": 1}, "test")


# --- The probe behind `status` -----------------------------------------------------------------


def test_the_probe_says_whether_a_run_would_be_fully_cached():
    job("test/cached", models=[SPEC])(lambda run: runtime._cached("score", SPEC, {"x": 1}, lambda: 0.5))
    job("test/direct", models=[SPEC])(lambda run: run.model(SPEC))
    job("test/computed")(lambda run: {"model": MODEL})

    assert runtime.probe(runtime.JOBS["test/cached"]) == "not cached"
    runtime._cached("score", SPEC, {"x": 1}, lambda: 0.5)
    assert runtime.probe(runtime.JOBS["test/cached"]) == "cached"
    assert runtime.probe(runtime.JOBS["test/direct"]) == "not cached: loads its model"
    assert runtime.probe(runtime.JOBS["test/computed"]) == "not cached: computed by the job"
    # Probing writes nothing and leaves the runner as it was.
    assert not common.DATA.exists()
    assert not runtime.SETTINGS.probe and runtime._CURRENT is None
