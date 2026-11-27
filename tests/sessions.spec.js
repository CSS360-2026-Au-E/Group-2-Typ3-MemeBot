import { expect } from "chai";
import fs from "fs";
import os from "os";
import path from "path";
import {
  startSession,
  endSession,
  getSession,
  addLine,
  formatTranscript,
  getSavedSessions,
  minutesSince,
  sessionLabel,
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

  it("forgets the session when it ends", () => {
    startSession("guild-1");
    endSession("guild-1");

    expect(getSession("guild-1")).to.equal(undefined);
  });

  it("ignores a line that arrives after the session ended", () => {
    startSession("guild-1");
    endSession("guild-1");

    expect(() => addLine("guild-1", "Leo", "Too late.")).to.not.throw();
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

describe("sessionLabel", () => {
  it("numbers sessions from 1 and adds the date", () => {
    // Noon local time, so the date is the same in every time zone.
    const session = { startedAt: new Date(2026, 10, 6, 12).getTime(), lines: [] };

    expect(sessionLabel(session, 0)).to.equal("Session 1 (Fri Nov 06 2026)");
    expect(sessionLabel(session, 2)).to.equal("Session 3 (Fri Nov 06 2026)");
  });
});

describe("minutesSince", () => {
  it("counts whole minutes and rounds down", () => {
    const startedAt = 1_000_000;

    expect(minutesSince(startedAt, startedAt)).to.equal(0);
    expect(minutesSince(startedAt, startedAt + 59_999)).to.equal(0);
    expect(minutesSince(startedAt, startedAt + 5 * 60_000 + 30_000)).to.equal(5);
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
