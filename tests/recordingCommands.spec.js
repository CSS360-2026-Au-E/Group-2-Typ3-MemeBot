import { expect } from "chai";
import startRecording from "../src/commands/startRecording";
import endRecording from "../src/commands/endRecording";

// A pretend slash command interaction that remembers what the bot replied.
const fakeInteraction = ({ voiceChannel = null } = {}) => {
  const interaction = {
    guild: { id: "guild-1" },
    member: { voice: { channel: voiceChannel } },
    replies: [],
    reply: async (message) => interaction.replies.push(message),
  };
  return interaction;
};

describe("/start-recording", () => {
  it("asks you to join a voice channel first", async () => {
    const interaction = fakeInteraction({ voiceChannel: null });

    await startRecording.execute(interaction);

    expect(interaction.replies).to.deep.equal(["Join a voice channel first."]);
  });
});

describe("/end-recording", () => {
  it("says so when nothing is being recorded", async () => {
    const interaction = fakeInteraction();

    await endRecording.execute(interaction);

    expect(interaction.replies).to.deep.equal(["No session is being recorded."]);
  });
});
