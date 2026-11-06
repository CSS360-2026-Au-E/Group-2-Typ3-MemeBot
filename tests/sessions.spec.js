import { expect } from "chai";
import fs from "fs";
import os from "os";
import path from "path";
import {
  startSession,
  getSession,
  addLine,
  formatTranscript,
  getSavedSessions,
} from "../src/scribe/sessions";

describe("sessions", () => {
  it("starts with an empty transcript", () => {
    startSession("guild-1");

    expect(getSession("guild-1").lines).to.deep.equal([]);
  });

  it("remembers when the session started", () => {
    const before = Date.now();
    startSession("guild-1");

    expect(getSession("guild-1").startedAt).to.be.at.least(before);
  });

  it("stores who said what", () => {
    startSession("guild-1");
    addLine("guild-1", "Leo", "I open the door.");

    expect(getSession("guild-1").lines).to.deep.equal([
      { speaker: "Leo", text: "I open the door." },
    ]);
  });

  it("starting a new session clears the old transcript", () => {
    startSession("guild-1");
    addLine("guild-1", "Leo", "I open the door.");
    startSession("guild-1");

    expect(getSession("guild-1").lines).to.deep.equal([]);
  });
});

describe("formatTranscript", () => {
  it("puts each line on its own row as 'Name: text'", () => {
    const lines = [
      { speaker: "Leo", text: "I open the door." },
      { speaker: "Dilshan", text: "I roll for stealth." },
    ];

    expect(formatTranscript(lines)).to.equal(
      "Leo: I open the door.\nDilshan: I roll for stealth."
    );
  });
});

describe("getSavedSessions", () => {
  it("returns this server's saved sessions, oldest first", () => {
    const folder = fs.mkdtempSync(path.join(os.tmpdir(), "saved-sessions-"));
    const save = (file, session) =>
      fs.writeFileSync(path.join(folder, file), JSON.stringify(session));
    save("guild-1-200.json", { startedAt: 200, lines: [] });
    save("guild-1-100.json", { startedAt: 100, lines: [] });
    save("guild-2-150.json", { startedAt: 150, lines: [] });

    const sessions = getSavedSessions("guild-1", folder);

    expect(sessions.map((session) => session.startedAt)).to.deep.equal([100, 200]);
    fs.rmSync(folder, { recursive: true });
  });

  it("returns nothing when no sessions were saved yet", () => {
    expect(getSavedSessions("guild-1", "no-such-folder")).to.deep.equal([]);
  });
});
