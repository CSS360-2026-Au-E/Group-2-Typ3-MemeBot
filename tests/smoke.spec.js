import fs from "fs";
import os from "os";
import path from "path";
import { expect } from "chai";
import commands from "../src/commands";
import interactionCreate from "../src/events/interactionCreate";
import { getSession, startSession } from "../src/scribe/sessions";
import { handleClip } from "../src/scribe/listen";
import { askChatGPT } from "../src/scribe/chat";
import { transcribe } from "../src/scribe/whisper";
import { playLinkFromMessage } from "../src/music/player";
import { findVideoId } from "../src/music/youtube";

// Smoke test: one quick pass over every major feature of the bot, so we know
// the core pieces still work together. It never touches the internet,
// Discord, a voice channel, or yt-dlp. Those are swapped for fakes.

const GUILD_ID = "smoke-guild";
const ONE_SECOND_OF_AUDIO = Buffer.alloc(48000 * 2);

const findCommand = (name) => commands.find((command) => command.data.name === name);

// A pretend slash command interaction that remembers everything the bot sent.
const fakeInteraction = ({ commandName = "status", question = null, voiceChannel = null } = {}) => {
  const interaction = {
    commandName,
    isChatInputCommand: () => true,
    guild: { id: GUILD_ID },
    member: { voice: { channel: voiceChannel } },
    options: { getString: () => question },
    replies: [],
    reply: async (message) => interaction.replies.push(message),
    deferReply: async () => {},
    editReply: async (message) => interaction.replies.push(message),
  };
  return interaction;
};

describe("Smoke test", () => {
  describe("commands are set up", () => {
    const expectedNames = [
      "start-recording",
      "end-recording",
      "status",
      "stop-music",
      "ask",
      "recap",
    ];

    it("has every command we expect", () => {
      const names = commands.map((command) => command.data.name);
      expect(names).to.have.members(expectedNames);
    });

    it("has no two commands with the same name", () => {
      const names = commands.map((command) => command.data.name);
      expect(new Set(names).size).to.equal(names.length);
    });

    it("can turn every command into what Discord needs", () => {
      // ready.js sends toJSON() to Discord. A bad option here breaks every command.
      commands.forEach((command) => {
        expect(command.execute).to.be.a("function");
        expect(command.data.toJSON()).to.include({ name: command.data.name });
      });
    });

    it("sends every slash command to the right handler", async () => {
      for (const command of commands) {
        const realExecute = command.execute;
        let called = false;
        command.execute = async () => {
          called = true;
        };

        try {
          await interactionCreate.execute(fakeInteraction({ commandName: command.data.name }));
        } finally {
          command.execute = realExecute;
        }

        expect(called, `/${command.data.name} was not called`).to.equal(true);
      }
    });
  });

  describe("recording a session from start to finish", () => {
    // /end-recording saves to "data/" in the current folder. Work in a temp
    // folder so the test doesn't leave files in the real one.
    const realFolder = process.cwd();
    let tempFolder;

    before(() => {
      tempFolder = fs.mkdtempSync(path.join(os.tmpdir(), "memebot-smoke-"));
      process.chdir(tempFolder);
    });

    after(() => {
      process.chdir(realFolder);
      fs.rmSync(tempFolder, { recursive: true, force: true });
    });

    it("/start-recording asks you to join voice first", async () => {
      const interaction = fakeInteraction();

      await findCommand("start-recording").execute(interaction);

      expect(interaction.replies).to.deep.equal(["Join a voice channel first."]);
    });

    it("records, transcribes, reports status, ends, and answers questions", async () => {
      // Joining voice needs a real Discord connection, so start the session directly.
      startSession(GUILD_ID);

      // Someone speaks for a second and "Whisper" hears them.
      await handleClip(GUILD_ID, "Leo", ONE_SECOND_OF_AUDIO, async () => "I open the door.");
      expect(getSession(GUILD_ID).lines).to.deep.equal([
        { speaker: "Leo", text: "I open the door." },
      ]);

      // /status sees the line.
      const statusInteraction = fakeInteraction();
      await findCommand("status").execute(statusInteraction);
      expect(statusInteraction.replies[0]).to.include("1 lines transcribed");

      // /end-recording posts the transcript and saves the session.
      const endInteraction = fakeInteraction();
      await findCommand("end-recording").execute(endInteraction);
      const reply = endInteraction.replies[0];
      expect(reply.content).to.include("Recording ended");
      expect(reply.files[0].attachment.toString()).to.equal("Leo: I open the door.");
      expect(getSession(GUILD_ID)).to.equal(undefined);
      expect(fs.readdirSync("data")).to.have.lengthOf(1);

      // /ask reads the saved session and passes it to "ChatGPT".
      let sentText;
      const askInteraction = fakeInteraction({ question: "What did Leo open?" });
      await findCommand("ask").execute(askInteraction, async (instructions, text) => {
        sentText = text;
        return "The door.";
      });
      expect(sentText).to.include("Leo: I open the door.");
      expect(sentText).to.include("Question: What did Leo open?");
      expect(askInteraction.replies).to.deep.equal(["The door."]);

      // /recap summarizes the same saved session.
      const recapInteraction = fakeInteraction();
      await findCommand("recap").execute(recapInteraction, async () => "- Leo opened a door.");
      expect(recapInteraction.replies[0]).to.include("Recap of Session 1");
      expect(recapInteraction.replies[0]).to.include("- Leo opened a door.");
    });
  });

  describe("OpenAI clients", () => {
    const realFetch = globalThis.fetch;
    afterEach(() => {
      globalThis.fetch = realFetch;
    });

    it("askChatGPT returns ChatGPT's answer", async () => {
      globalThis.fetch = async () => ({
        ok: true,
        json: async () => ({ choices: [{ message: { content: "Gorm." } }] }),
      });

      expect(await askChatGPT("Answer briefly.", "Who is the blacksmith?")).to.equal("Gorm.");
    });

    it("transcribe returns Whisper's text", async () => {
      globalThis.fetch = async () => ({ ok: true, json: async () => ({ text: "Roll for it." }) });

      expect(await transcribe(ONE_SECOND_OF_AUDIO)).to.equal("Roll for it.");
    });
  });

  describe("music", () => {
    it("finds a YouTube link and plays it for someone in voice", async () => {
      const voiceChannel = { id: "tavern" };
      const replies = [];
      const message = {
        author: { bot: false },
        guild: { id: GUILD_ID },
        member: { voice: { channel: voiceChannel } },
        content: "tavern music https://youtu.be/aqz-KE-bpKQ",
        channel: { sendTyping: async () => {} },
        reply: async (reply) => replies.push(reply),
      };

      expect(findVideoId(message.content)).to.equal("aqz-KE-bpKQ");

      let played;
      await playLinkFromMessage(message, async (channel, videoId) => {
        played = { channel, videoId };
        return "🎵 Now playing";
      });

      expect(played).to.deep.equal({ channel: voiceChannel, videoId: "aqz-KE-bpKQ" });
      expect(replies[0].content).to.equal("🎵 Now playing");
    });

    it("/stop-music says so when nothing is playing", async () => {
      const interaction = fakeInteraction();

      await findCommand("stop-music").execute(interaction);

      expect(interaction.replies).to.deep.equal(["No music is playing."]);
    });
  });
});
