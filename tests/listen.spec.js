import { expect } from "chai";
import { handleClip } from "../src/scribe/listen";
import { startSession, getSession } from "../src/scribe/sessions";

const ONE_SECOND_CLIP = Buffer.alloc(48000 * 2);
const SHORT_CLIP = Buffer.alloc(100);

describe("handleClip", () => {
  beforeEach(() => startSession("guild-1"));

  it("saves what each person said under their name", async () => {
    await handleClip("guild-1", "Leo", ONE_SECOND_CLIP, async () => "I open the door.");
    await handleClip("guild-1", "Dilshan", ONE_SECOND_CLIP, async () => "I roll for stealth.");

    expect(getSession("guild-1").lines).to.deep.equal([
      { speaker: "Leo", text: "I open the door." },
      { speaker: "Dilshan", text: "I roll for stealth." },
    ]);
  });

  it("skips clips shorter than a second", async () => {
    let whisperWasCalled = false;
    const fakeTranscribe = async () => {
      whisperWasCalled = true;
      return "Hmm.";
    };

    await handleClip("guild-1", "Leo", SHORT_CLIP, fakeTranscribe);

    expect(whisperWasCalled).to.equal(false);
    expect(getSession("guild-1").lines).to.deep.equal([]);
  });

  it("does not save empty text", async () => {
    await handleClip("guild-1", "Leo", ONE_SECOND_CLIP, async () => "  ");

    expect(getSession("guild-1").lines).to.deep.equal([]);
  });
});
