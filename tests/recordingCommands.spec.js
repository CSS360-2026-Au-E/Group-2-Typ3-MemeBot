import fs from "fs";
import { expect } from "chai";
import startRecording from "../src/commands/startRecording";
import endRecording from "../src/commands/endRecording";
import { getSession, startSession } from "../src/scribe/sessions";

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

  it("refuses to start a second session", async () => {
    startSession("guild-1");
    const interaction = fakeInteraction({ voiceChannel: { id: "tavern" } });

    await startRecording.execute(interaction);

    expect(interaction.replies).to.deep.equal(["A session is already being recorded."]);
  });
});

describe("/end-recording", () => {
  it("ends the session even if the bot is no longer in voice", async () => {
    startSession("guild-1");
    const savedFile = `data/guild-1-${getSession("guild-1").startedAt}.json`;
    const interaction = fakeInteraction();

    await endRecording.execute(interaction);
    fs.rmSync(savedFile);

    expect(interaction.replies[0].content).to.include("Recording ended");
    expect(getSession("guild-1")).to.equal(undefined);
  });

  it("says so when nothing is being recorded", async () => {
    const interaction = fakeInteraction();

    await endRecording.execute(interaction);

    expect(interaction.replies).to.deep.equal(["No session is being recorded."]);
  });
});
