import { expect } from "chai";
import recap from "../src/commands/recap";

// A pretend /recap interaction that remembers what the bot replied.
const fakeInteraction = () => {
  const interaction = {
    guild: { id: "recap-guild" },
    replies: [],
    edits: [],
    reply: async (message) => interaction.replies.push(message),
    deferReply: async () => {},
    editReply: async (message) => interaction.edits.push(message),
  };
  return interaction;
};

const session = (startedAt, lines) => ({ startedAt, lines });

describe("/recap", () => {
  it("says so when there are no saved sessions", async () => {
    const interaction = fakeInteraction();

    await recap.execute(interaction, async () => "should not be called", () => []);

    expect(interaction.replies).to.deep.equal(["There's no past session to recap yet."]);
  });

  it("says so when every saved session is empty", async () => {
    const interaction = fakeInteraction();

    await recap.execute(interaction, async () => "should not be called", () => [
      session(100, []),
    ]);

    expect(interaction.replies).to.deep.equal(["There's no past session to recap yet."]);
  });

  it("recaps the most recent session that has lines", async () => {
    const interaction = fakeInteraction();
    const saved = [
      session(100, [{ speaker: "Leo", text: "We meet Gorm the blacksmith." }]),
      session(200, [{ speaker: "Dilshan", text: "We reach the cave." }]),
      session(300, []), // started and ended with nothing said
    ];

    let sentText;
    const fakeAsk = async (instructions, text) => {
      sentText = text;
      return "- The party reached the cave.";
    };

    await recap.execute(interaction, fakeAsk, () => saved);

    expect(sentText).to.equal("Dilshan: We reach the cave.");
    expect(interaction.edits).to.have.length(1);
    expect(interaction.edits[0]).to.include("Recap of Session 2");
    expect(interaction.edits[0]).to.include("- The party reached the cave.");
  });

  it("tells the user when ChatGPT fails instead of leaving them waiting", async () => {
    const interaction = fakeInteraction();
    const failingAsk = async () => {
      throw new Error("OpenAI is down");
    };

    await recap.execute(interaction, failingAsk, () => [
      session(100, [{ speaker: "Leo", text: "I open the door." }]),
    ]);

    expect(interaction.edits).to.deep.equal([
      "❌ I couldn't make a recap right now. Try again in a bit.",
    ]);
  });
});