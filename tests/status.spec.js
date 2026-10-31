import { expect } from "chai";
import status from "../src/commands/status";
import { startSession, addLine, getSession } from "../src/scribe/sessions";

const fakeInteraction = (guildId) => {
  const interaction = {
    guild: { id: guildId },
    replies: [],
    reply: async (message) => interaction.replies.push(message),
  };
  return interaction;
};

describe("/status", () => {
  it("says so when nothing is being recorded", async () => {
    const interaction = fakeInteraction("status-idle");

    await status.execute(interaction, () => false);

    expect(interaction.replies).to.deep.equal([
      "⏸️ Not recording right now. Use /start-recording to begin a session.",
    ]);
  });

  it("shows how long the session has been recording and the line count", async () => {
    startSession("status-live");
    addLine("status-live", "Leo", "I open the door.");
    // Pretend the session started 5 minutes ago.
    getSession("status-live").startedAt = Date.now() - 5 * 60000;
    const interaction = fakeInteraction("status-live");

    await status.execute(interaction, () => true);

    expect(interaction.replies).to.deep.equal([
      "🎙️ Recording for 5 minutes. 1 lines transcribed so far.",
    ]);
  });

  it("says not recording after the session ended", async () => {
    startSession("status-ended");
    const interaction = fakeInteraction("status-ended");

    // Session is still in memory, but the bot left voice.
    await status.execute(interaction, () => false);

    expect(interaction.replies[0]).to.include("Not recording");
  });
});
