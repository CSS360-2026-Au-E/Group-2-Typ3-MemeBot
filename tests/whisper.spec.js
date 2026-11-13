import { expect } from "chai";
import { transcribe, isLikelySpeech } from "../src/scribe/whisper";

// A piece of text Whisper is confident someone really said.
const speech = (text) => ({ text, no_speech_prob: 0.01, avg_logprob: -0.2, compression_ratio: 1.2 });

describe("transcribe", () => {
  const realFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  // Pretend to be OpenAI so the tests don't need the internet or an API key.
  const fakeWhisper = (reply) => {
    const requests = [];
    globalThis.fetch = async (url, options) => {
      requests.push({ url, options });
      return { ok: true, json: async () => reply };
    };
    return requests;
  };

  it("sends the audio to Whisper and returns the text", async () => {
    const requests = fakeWhisper({ text: "I open the door.", segments: [speech("I open the door.")] });

    const text = await transcribe(Buffer.alloc(100));

    expect(text).to.equal("I open the door.");
    const body = requests[0].options.body;
    expect(requests[0].url).to.equal("https://api.openai.com/v1/audio/transcriptions");
    expect(body.get("model")).to.equal("whisper-1");
    expect(body.get("file").name).to.equal("clip.wav");
  });

  it("asks Whisper for steady English with how sure it was", async () => {
    const requests = fakeWhisper({ text: "", segments: [] });

    await transcribe(Buffer.alloc(100));

    const body = requests[0].options.body;
    expect(body.get("response_format")).to.equal("verbose_json");
    expect(body.get("temperature")).to.equal("0");
    expect(body.get("language")).to.equal("en");
    expect(body.get("prompt")).to.include("Dungeons & Dragons");
  });

  it("joins the pieces Whisper is sure about", async () => {
    fakeWhisper({ segments: [speech(" I open the door."), speech(" Then I look inside.")] });

    expect(await transcribe(Buffer.alloc(100))).to.equal("I open the door. Then I look inside.");
  });

  it("drops a piece Whisper thinks was just noise", async () => {
    fakeWhisper({
      segments: [
        speech("I roll for stealth."),
        { text: " Bye.", no_speech_prob: 0.9, avg_logprob: -1.5, compression_ratio: 0.5 },
      ],
    });

    expect(await transcribe(Buffer.alloc(100))).to.equal("I roll for stealth.");
  });

  it("returns nothing when every piece was noise", async () => {
    fakeWhisper({
      segments: [{ text: " Thank you.", no_speech_prob: 0.8, avg_logprob: -1.2, compression_ratio: 0.6 }],
    });

    expect(await transcribe(Buffer.alloc(100))).to.equal("");
  });

  it("uses the plain text when Whisper sends no pieces", async () => {
    fakeWhisper({ text: "I open the door." });

    expect(await transcribe(Buffer.alloc(100))).to.equal("I open the door.");
  });
});

describe("isLikelySpeech", () => {
  it("keeps text Whisper is confident about", () => {
    expect(isLikelySpeech(speech("I open the door."))).to.equal(true);
  });

  it("keeps quiet speech when Whisper is still sure of the words", () => {
    expect(isLikelySpeech({ ...speech("I whisper to the elf."), no_speech_prob: 0.7 })).to.equal(true);
  });

  it("drops text that was probably not speech and that Whisper was unsure of", () => {
    expect(isLikelySpeech({ ...speech("Bye."), no_speech_prob: 0.9, avg_logprob: -1.5 })).to.equal(false);
  });

  it("drops text where Whisper got stuck repeating itself", () => {
    expect(isLikelySpeech({ ...speech("the the the the the"), compression_ratio: 3.1 })).to.equal(false);
  });
});
