import { expect } from "chai";
import { ChannelType } from "discord.js";
import commands from "../src/commands";
import { captureConsole } from "./helpers/captureConsole";

const CHANNEL = "scribe-log";

// ready.js reads CHANNEL_NAME once, when it is first loaded, so set it
// before loading the file and put the old value back right after.
const oldChannelName = process.env.CHANNEL_NAME;
process.env.CHANNEL_NAME = CHANNEL;
const ready = require("../src/events/ready").default;
if (oldChannelName === undefined) delete process.env.CHANNEL_NAME;
else process.env.CHANNEL_NAME = oldChannelName;

// A pretend text channel that remembers what the bot posted.
const fakeChannel = ({ name = CHANNEL, type = ChannelType.GuildText, failToSend = false } = {}) => {
  const channel = {
    name,
    type,
    sent: [],
    send: async (message) => {
      if (failToSend) throw new Error("Missing Permissions");
      channel.sent.push(message);
    },
  };
  return channel;
};

// A pretend server that remembers which slash commands it was given.
const fakeGuild = (name, channels = []) => {
  const guild = {
    name,
    registered: null,
    commands: { set: async (list) => (guild.registered = list) },
    channels: { fetch: async () => {}, cache: channels },
  };
  return guild;
};

const fakeClient = (guilds) => ({
  user: { username: "typ3" },
  guilds: { cache: new Map(guilds.map((guild, index) => [String(index), guild])) },
  users: { cache: { size: 4 } },
});

describe("ready", () => {
  it("registers every slash command in every server", async () => {
    const guilds = [fakeGuild("Tavern"), fakeGuild("Dungeon")];

    await captureConsole(() => ready.execute(fakeClient(guilds)));

    const expected = commands.map((command) => command.data.name);
    for (const guild of guilds) {
      expect(guild.registered.map((command) => command.name)).to.deep.equal(expected);
    }
  });

  it("posts the online message and command list to the scribe channel", async () => {
    const channel = fakeChannel();

    await captureConsole(() => ready.execute(fakeClient([fakeGuild("Tavern", [channel])])));

    expect(channel.sent).to.have.length(1);
    const titles = channel.sent[0].embeds.map((embed) => embed.data.title);
    expect(titles).to.deep.equal(["D&D Session Scribe Online", "Planned Session Scribe Commands"]);
  });

  it("logs an error when the server has no scribe text channel", async () => {
    // A voice channel with the right name doesn't count.
    const voiceChannel = fakeChannel({ type: ChannelType.GuildVoice });

    const logged = await captureConsole(() =>
      ready.execute(fakeClient([fakeGuild("Tavern", [voiceChannel])]))
    );

    expect(voiceChannel.sent).to.deep.equal([]);
    expect(logged.error[0]).to.include(`Could not find a text channel named "${CHANNEL}" in Tavern`);
  });

  it("keeps going when Discord won't let it post in one server", async () => {
    const blocked = fakeChannel({ failToSend: true });
    const working = fakeChannel();

    const logged = await captureConsole(() =>
      ready.execute(fakeClient([fakeGuild("Tavern", [blocked]), fakeGuild("Dungeon", [working])]))
    );

    expect(logged.error[0]).to.include(`Could not send the ready message to #${CHANNEL}`);
    expect(working.sent).to.have.length(1);
  });
});
