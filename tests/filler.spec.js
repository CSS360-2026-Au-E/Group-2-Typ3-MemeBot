import { expect } from "chai";
import { isWhisperFiller } from "../src/scribe/filler";

describe("isWhisperFiller", () => {
  it("spots the sign-offs Whisper makes up for coughs and noise", () => {
    expect(isWhisperFiller("Bye.")).to.equal(true);
    expect(isWhisperFiller("Thanks for watching!")).to.equal(true);
    expect(isWhisperFiller("you")).to.equal(true);
  });

  it("ignores capital letters, punctuation and extra spaces", () => {
    expect(isWhisperFiller("  THANK   YOU! ")).to.equal(true);
    expect(isWhisperFiller("Subtitles by the Amara.org community")).to.equal(true);
  });

  it("keeps real lines that only contain those words", () => {
    expect(isWhisperFiller("Thank you, innkeeper.")).to.equal(false);
    expect(isWhisperFiller("I say bye to the guard.")).to.equal(false);
    expect(isWhisperFiller("Did you see that?")).to.equal(false);
  });
});
