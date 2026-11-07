import { expect } from "chai";
import ask from "../src/commands/ask";
import { startSession, addLine } from "../src/scribe/sessions";

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
});
