import { execFile, spawn } from "child_process";
import { promisify } from "util";
import ffmpegPath from "ffmpeg-static";
import { constants } from "youtube-dl-exec";

const YOUTUBE_LINK =
  /(?<![\w./-])(?:https?:\/\/)?(?:(?:www|m|music)\.)?(?:youtube\.com\/(?:watch\?(?:\S*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([\w-]{11})(?![\w-])/i;

const YT_DLP_OPTIONS = [
  "--no-playlist",
  "--no-warnings",
  // YouTube needs a JavaScript runtime, so lend yt-dlp the one running the bot.
  "--js-runtimes",
  `node:${process.execPath}`,
  "--ffmpeg-location",
  ffmpegPath,
];

// Only the video id comes from chat. We build the URL ourselves so a message
// can't slip extra options into yt-dlp or point it at another website.
const videoUrl = (videoId) => `https://www.youtube.com/watch?v=${videoId}`;

// Returns the id of the first YouTube video linked in the text, or null.
export function findVideoId(text) {
  return text.match(YOUTUBE_LINK)?.[1] ?? null;
}

export async function getVideoTitle(videoId) {
  const { stdout } = await promisify(execFile)(constants.YOUTUBE_DL_PATH, [
    ...YT_DLP_OPTIONS,
    "--print",
    "%(title)s",
    videoUrl(videoId),
  ]);
  return stdout.trim();
}

// Starts yt-dlp sending the video's audio to its stdout.
export function streamAudio(videoId) {
  const download = spawn(
    constants.YOUTUBE_DL_PATH,
    [
      ...YT_DLP_OPTIONS,
      "--quiet",
      "--format",
      "bestaudio[ext=webm]/bestaudio/best",
      "--output",
      "-",
      videoUrl(videoId),
    ],
    { stdio: ["ignore", "pipe", "inherit"] }
  );
  download.on("error", (error) => console.error("Could not start yt-dlp:", error));
  return download;
}
