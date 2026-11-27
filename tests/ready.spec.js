import { expect } from "chai";
import { ChannelType } from "discord.js";
import commands from "../src/commands";
import ready from "../src/events/ready";
import { captureConsole } from "./helpers/captureConsole";

const CHANNEL = "scribe-log";

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
  // ready.js reads CHANNEL_NAME when it runs. Put the real value back after each test.
  const oldChannelName = process.env.CHANNEL_NAME;
  beforeEach(() => {
    process.env.CHANNEL_NAME = CHANNEL;
  });
  afterEach(() => {
    if (oldChannelName === undefined) delete process.env.CHANNEL_NAME;
    else process.env.CHANNEL_NAME = oldChannelName;
  });

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
    expect(titles).to.deep.equal(["D&D Session Scribe Online", "Session Scribe Commands"]);
  });

  it("lists exactly the commands the bot has, with their descriptions", async () => {
    const channel = fakeChannel();

    await captureConsole(() => ready.execute(fakeClient([fakeGuild("Tavern", [channel])])));

    const list = channel.sent[0].embeds[1].data.description;
    const expected = commands.map(
      (command) => `\`/${command.data.name}\` - ${command.data.description}`
    );
    expect(list.split("\n")).to.deep.equal(expected);
    // The old message called working commands "planned" and listed ones that don't exist.
    expect(list).to.not.include("not currently available");
    expect(list).to.not.include("/settings");
  });

  it("logs a missing CHANNEL_NAME once and still registers commands", async () => {
    delete process.env.CHANNEL_NAME;
    const guilds = [fakeGuild("Tavern"), fakeGuild("Dungeon")];

    const logged = await captureConsole(() => ready.execute(fakeClient(guilds)));

    expect(logged.error).to.deep.equal(["CHANNEL_NAME is not configured in the environment."]);
    guilds.forEach((guild) => expect(guild.registered).to.have.length(commands.length));
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
