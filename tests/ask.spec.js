import { expect } from "chai";
import ask from "../src/commands/ask";
import { startSession, addLine } from "../src/scribe/sessions";
import { captureConsole } from "./helpers/captureConsole";

// A pretend /ask interaction that remembers what the bot replied.
const fakeInteraction = (guildId, question) => {
  const interaction = {
    guild: { id: guildId },
    options: { getString: () => question },
    replies: [],
    edits: [],
    reply: async (message) => interaction.replies.push(message),
    deferReply: async () => {},
    editReply: async (message) => interaction.edits.push(message),
  };
  return interaction;
};

describe("/ask", () => {
  it("says so when nothing has been transcribed yet", async () => {
    const interaction = fakeInteraction("ask-nothing", "Who is the blacksmith?");

    await ask.execute(interaction, async () => "should not be called");

    expect(interaction.replies).to.deep.equal(["Nothing has been transcribed yet."]);
  });

  it("asks ChatGPT the question with the transcript and replies with the answer", async () => {
    startSession("ask-live");
    addLine("ask-live", "Leo", "The blacksmith is called Gorm.");
    const interaction = fakeInteraction("ask-live", "Who is the blacksmith?");

    let sentText;
    const fakeAsk = async (instructions, text) => {
      sentText = text;
      return "The blacksmith is Gorm.";
    };

    await ask.execute(interaction, fakeAsk);

    expect(sentText).to.include("Current session:\nLeo: The blacksmith is called Gorm.");
    expect(sentText).to.include("Question: Who is the blacksmith?");
    expect(interaction.edits).to.deep.equal(["The blacksmith is Gorm."]);
  });

  it("tells the user when ChatGPT fails instead of leaving them waiting", async () => {
    startSession("ask-fail");
    addLine("ask-fail", "Leo", "I open the door.");
    const interaction = fakeInteraction("ask-fail", "What did Leo open?");
    const failingAsk = async () => {
      throw new Error("OpenAI is down");
    };

    // Catch the error log so the test output doesn't look like a failure.
    const logged = await captureConsole(() => ask.execute(interaction, failingAsk));

    expect(interaction.edits).to.deep.equal([
      "❌ I couldn't answer that right now. Try again in a bit.",
    ]);
    // The error is still logged for whoever runs the bot.
    expect(logged.error[0]).to.include("/ask failed:");
    expect(logged.error[0]).to.include("OpenAI is down");
  });
});
