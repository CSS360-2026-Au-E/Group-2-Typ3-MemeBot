import { expect } from "chai";
import { askChatGPT } from "../src/scribe/chat";

describe("askChatGPT", () => {
  const realFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  it("sends the instructions and text to ChatGPT and returns the answer", async () => {
    // Pretend to be OpenAI so the test doesn't need the internet or an API key.
    let request;
    globalThis.fetch = async (url, options) => {
      request = { url, body: JSON.parse(options.body) };
      return {
        ok: true,
        json: async () => ({ choices: [{ message: { content: "Gorm." } }] }),
      };
    };

    const answer = await askChatGPT("Answer briefly.", "Who is the blacksmith?");

    expect(answer).to.equal("Gorm.");
    expect(request.url).to.equal("https://api.openai.com/v1/chat/completions");
    expect(request.body.messages).to.deep.equal([
      { role: "system", content: "Answer briefly." },
      { role: "user", content: "Who is the blacksmith?" },
    ]);
  });
});
