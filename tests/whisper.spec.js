import { expect } from "chai";
import { transcribe } from "../src/scribe/whisper";

describe("transcribe", () => {
  const realFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  it("sends the audio to Whisper and returns the text", async () => {
    // Pretend to be OpenAI so the test doesn't need the internet or an API key.
    let request;
    globalThis.fetch = async (url, options) => {
      request = { url, options };
      return { ok: true, json: async () => ({ text: "I open the door." }) };
    };

    const text = await transcribe(Buffer.alloc(100));

    expect(text).to.equal("I open the door.");
    expect(request.url).to.equal("https://api.openai.com/v1/audio/transcriptions");
    expect(request.options.body.get("model")).to.equal("whisper-1");
    expect(request.options.body.get("file").name).to.equal("clip.wav");
  });
});
