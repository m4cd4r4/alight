// Run with: npm test  (Node's built-in runner; Node strips the TS types)
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseLrc } from "./lrc.ts";

test("parses [mm:ss.xx] lines into sorted {time,text}", () => {
  const lrc = ["[00:00.00]First line", "[00:12.34]Second line", "[01:05.50]Third line"].join("\n");
  assert.deepEqual(parseLrc(lrc), [
    { time: 0, text: "First line" },
    { time: 12.34, text: "Second line" },
    { time: 65.5, text: "Third line" },
  ]);
});

test("centiseconds and milliseconds both read as a second fraction", () => {
  // .5 -> 0.5s, .05 -> 0.05s, .500 -> 0.5s
  const lrc = ["[00:01.5]a", "[00:02.05]b", "[00:03.500]c"].join("\n");
  assert.deepEqual(parseLrc(lrc), [
    { time: 1.5, text: "a" },
    { time: 2.05, text: "b" },
    { time: 3.5, text: "c" },
  ]);
});

test("several timestamps on one line emit one entry each", () => {
  const lrc = "[00:10.00][00:20.00]repeated chorus line";
  assert.deepEqual(parseLrc(lrc), [
    { time: 10, text: "repeated chorus line" },
    { time: 20, text: "repeated chorus line" },
  ]);
});

test("metadata tags and timed spacer lines are skipped", () => {
  const lrc = [
    "[ti:Amazing Grace]",
    "[ar:Traditional]",
    "[length:03:53]",
    "[00:00.00]",
    "[00:01.00]real line",
  ].join("\n");
  assert.deepEqual(parseLrc(lrc), [{ time: 1, text: "real line" }]);
});

test("a positive offset shifts lyrics earlier, never below zero", () => {
  const lrc = ["[offset:+500]", "[00:00.20]early", "[00:10.00]later"].join("\n");
  assert.deepEqual(parseLrc(lrc), [
    { time: 0, text: "early" }, // 0.20 - 0.50 clamped to 0
    { time: 9.5, text: "later" }, // 10.00 - 0.50
  ]);
});

test("empty or untimed input yields no lines, never throws", () => {
  assert.deepEqual(parseLrc(""), []);
  assert.deepEqual(parseLrc("just some plain text\nno timestamps here"), []);
});
