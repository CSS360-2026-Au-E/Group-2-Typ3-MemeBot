import { expect } from "chai";
import { startSession, endSession, getSession, addLine } from "../src/scribe/sessions";

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
