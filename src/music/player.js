import {
  AudioPlayerStatus,
  StreamType,
  VoiceConnectionStatus,
  createAudioPlayer,
  createAudioResource,
  entersState,
  getVoiceConnection,
  joinVoiceChannel,
} from "@discordjs/voice";
import { getSession } from "../scribe/sessions";
import { findVideoId, getVideoTitle, streamAudio } from "./youtube";

const START_TIMEOUT = 30000;
const PLAY_FAILED = "❌ I couldn't play that link. The video may be private, removed, or blocked.";

// One audio player per server (guild), plus the download feeding it.
const music = new Map();

function getMusic(guildId) {
  if (!music.has(guildId)) {
    const player = createAudioPlayer();
    player.on("error", (error) => console.error("Music player error:", error));
    // Stay in voice if a session is still being recorded.
    player.on(AudioPlayerStatus.Idle, () => {
      if (!getSession(guildId)) getVoiceConnection(guildId)?.destroy();
    });
    music.set(guildId, { player, download: null });
  }
  return music.get(guildId);
}

export function isMusicPlaying(guildId) {
  const status = music.get(guildId)?.player.state.status;
  return Boolean(status) && status !== AudioPlayerStatus.Idle;
}

export function stopMusic(guildId) {
  if (!isMusicPlaying(guildId)) return false;

  const { player, download } = music.get(guildId);
  player.stop(true);
  download.kill();
  return true;
}

// The bot can only be in one voice channel per server, and joining another
// would drag a recording or the music along with it.
export function isInOtherChannel(voiceChannel) {
  const connection = getVoiceConnection(voiceChannel.guild.id);
  if (!connection || connection.state.status === VoiceConnectionStatus.Disconnected) return false;
  return connection.joinConfig.channelId !== voiceChannel.id;
}

// Plays the video in the voice channel, replacing anything already playing.
// Returns the message to show in chat.
export async function playVideo(voiceChannel, videoId) {
  const { guild } = voiceChannel;

  let title;
  try {
    title = await getVideoTitle(videoId);
  } catch (error) {
    console.error(`Could not look up video ${videoId}:`, error);
    return PLAY_FAILED;
  }

  if (isInOtherChannel(voiceChannel)) {
    return "I'm busy in another voice channel. Join me there to play music.";
  }

  // If the bot is already here this reuses the connection. It joins undeafened
  // so that /start-recording can use the same connection to hear people.
  const connection = joinVoiceChannel({
    channelId: voiceChannel.id,
    guildId: guild.id,
    adapterCreator: guild.voiceAdapterCreator,
    selfDeaf: false,
  });

  const current = getMusic(guild.id);
  const previousDownload = current.download;
  current.download = streamAudio(videoId);
  current.player.play(
    createAudioResource(current.download.stdout, { inputType: StreamType.Arbitrary })
  );
  previousDownload?.kill();
  connection.subscribe(current.player);

  try {
    await entersState(current.player, AudioPlayerStatus.Playing, START_TIMEOUT);
  } catch (error) {
    console.error(`Could not start video ${videoId}:`, error);
    stopMusic(guild.id);
    return PLAY_FAILED;
  }

  return `🎵 Now playing: **${title}**\nUse /stop-music to stop.`;
}

// Plays the first YouTube link in a chat message. Someone who isn't in voice
// is just sharing a link, so the bot leaves those alone.
export async function playLinkFromMessage(message, play = playVideo) {
  if (message.author.bot || !message.guild) return;

  const videoId = findVideoId(message.content);
  const voiceChannel = message.member?.voice.channel;
  if (!videoId || !voiceChannel) return;

  await message.channel.sendTyping();
  const content = await play(voiceChannel, videoId);
  // Video titles are written by strangers, so they must not be able to ping anyone.
  await message.reply({ content, allowedMentions: { parse: [] } });
}
