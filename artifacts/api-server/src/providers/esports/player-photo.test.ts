import assert from "node:assert/strict";
import test from "node:test";
import { pickPhoto } from "./player-photo";

test("picks the player's newest event photo and ignores team logos and other players", () => {
  const files = [
    { title: "File:LOUD allmode.png", url: "logo" },
    { title: "File:Darker at VCT 2025 Masters.jpg", url: "old" },
    { title: "File:Darker at VCT 2026 Americas Stage 1.jpg", url: "new" },
    { title: "File:LOUD Darker the Valorant Champions trophy.jpg", url: "trophy" },
  ];
  assert.equal(pickPhoto("Darker", files), "new");
  assert.equal(pickPhoto("erde", files), null);
  assert.equal(pickPhoto("erde", [{ title: "File:LOUD erde at VCT Americas 2026 Stage 1.jpg", url: "team-first" }]), "team-first");
});
