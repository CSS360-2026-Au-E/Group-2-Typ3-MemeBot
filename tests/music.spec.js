import { expect } from "chai";
import commands from "../src/commands";
import { isMusicPlaying, playLinkFromMessage, stopMusic } from "../src/music/player";
import { findVideoId } from "../src/music/youtube";

const VIDEO_ID = "aqz-KE-bpKQ";

describe("findVideoId", () => {
  const links = [
    `https://www.youtube.com/watch?v=${VIDEO_ID}`,
    `http://youtube.com/watch?v=${VIDEO_ID}`,
    `youtube.com/watch?v=${VIDEO_ID}`,
    `https://m.youtube.com/watch?v=${VIDEO_ID}`,
    `https://music.youtube.com/watch?v=${VIDEO_ID}&si=abc`,
    `https://www.youtube.com/watch?list=PL123&v=${VIDEO_ID}&t=30s`,
    `https://youtu.be/${VIDEO_ID}?si=abc`,
    `https://www.youtube.com/shorts/${VIDEO_ID}`,
    `https://www.youtube.com/live/${VIDEO_ID}`,
    `https://www.youtube.com/embed/${VIDEO_ID}`,
  ];

  links.forEach((link) => {
    it(`finds the video in ${link}`, () => {
      expect(findVideoId(link)).to.equal(VIDEO_ID);
    });
  });

  it("finds a link in the middle of a sentence", () => {
    expect(findVideoId(`tavern music: <https://youtu.be/${VIDEO_ID}> enjoy`)).to.equal(VIDEO_ID);
  });

  it("keeps ids that start with a dash", () => {
    expect(findVideoId("https://youtu.be/-abcdefghij")).to.equal("-abcdefghij");
  });

  const notVideos = [
    "I open the door.",
    "https://example.com/watch?v=aqz-KE-bpKQ",
    "https://notyoutube.com/watch?v=aqz-KE-bpKQ",
    "https://evil-youtube.com/watch?v=aqz-KE-bpKQ",
    "https://example.com/youtube.com/watch?v=aqz-KE-bpKQ",
    "https://www.youtube.com/playlist?list=PL1234567890",
    "https://www.youtube.com/watch?v=tooshort",
    "https://www.youtube.com/watch?v=aqz-KE-bpKQ-toolong",
  ];

  notVideos.forEach((text) => {
    it(`ignores ${text}`, () => {
      expect(findVideoId(text)).to.equal(null);
    });
  });
});

// A pretend chat message that remembers what the bot replied.
const fakeMessage = ({ content, voiceChannel = "tavern", bot = false, guild = { id: "g" } }) => {
  const message = {
    content,
    guild,
    author: { bot },
    member: { voice: { channel: voiceChannel } },
    channel: { sendTyping: async () => {} },
    replies: [],
    reply: async (reply) => message.replies.push(reply),
  };
  return message;
};

describe("playLinkFromMessage", () => {
  const fakePlayer = () => {
    const play = async (voiceChannel, videoId) => {
      play.calls.push({ voiceChannel, videoId });
      return "🎵 Now playing: **@everyone**";
    };
    play.calls = [];
    return play;
  };

  it("plays a link posted by someone in voice", async () => {
    const play = fakePlayer();
    const message = fakeMessage({ content: `https://youtu.be/${VIDEO_ID}` });

    await playLinkFromMessage(message, play);

    expect(play.calls).to.deep.equal([{ voiceChannel: "tavern", videoId: VIDEO_ID }]);
  });

  it("doesn't let a video title ping anyone", async () => {
    const message = fakeMessage({ content: `https://youtu.be/${VIDEO_ID}` });

    await playLinkFromMessage(message, fakePlayer());

    expect(message.replies).to.deep.equal([
      { content: "🎵 Now playing: **@everyone**", allowedMentions: { parse: [] } },
    ]);
  });

  const ignored = {
    "messages without a link": { content: "I open the door." },
    "links from people not in voice": {
      content: `https://youtu.be/${VIDEO_ID}`,
      voiceChannel: null,
    },
    "links from bots": { content: `https://youtu.be/${VIDEO_ID}`, bot: true },
    "direct messages": { content: `https://youtu.be/${VIDEO_ID}`, guild: null },
  };

  Object.entries(ignored).forEach(([name, options]) => {
    it(`ignores ${name}`, async () => {
      const play = fakePlayer();
      const message = fakeMessage(options);

      await playLinkFromMessage(message, play);

      expect(play.calls).to.deep.equal([]);
      expect(message.replies).to.deep.equal([]);
    });
  });
});

describe("/stop-music", () => {
  const stopMusicCommand = commands.find((command) => command.data.name === "stop-music");

  it("says so when no music is playing", async () => {
    const replies = [];

    await stopMusicCommand.execute({
      guild: { id: "quiet-guild" },
      reply: async (message) => replies.push(message),
    });

    expect(replies).to.deep.equal(["No music is playing."]);
  });

  it("has nothing to stop in a server that never played music", () => {
    expect(isMusicPlaying("quiet-guild")).to.equal(false);
    expect(stopMusic("quiet-guild")).to.equal(false);
  });
});
