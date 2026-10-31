import { EndBehaviorType } from "@discordjs/voice";
import prism from "prism-media";
import { addLine } from "./sessions";
import { transcribe as whisperTranscribe } from "./whisper";

// 48,000 samples per second, 2 bytes each (mono)
const ONE_SECOND_OF_AUDIO = 48000 * 2;

// Discord sends a separate audio stream for each person,
// so we always know who said what.
export function listenToSpeakers(connection, guild) {
  const receiver = connection.receiver;

  receiver.speaking.on("start", (userId) => {
    // We're already listening to this person.
    if (receiver.subscriptions.has(userId)) return;

    // Listen until they've been quiet for 1 second.
    const opusAudio = receiver.subscribe(userId, {
      end: { behavior: EndBehaviorType.AfterSilence, duration: 1000 },
    });

    // Turn Discord's compressed audio into raw sound.
    const decoder = new prism.opus.Decoder({ rate: 48000, channels: 1, frameSize: 960 });
    const chunks = [];

    opusAudio.pipe(decoder);
    decoder.on("data", (chunk) => chunks.push(chunk));
    decoder.on("error", (error) => console.error("Could not decode audio:", error));
    decoder.on("end", async () => {
      try {
        const member = await guild.members.fetch(userId);
        await handleClip(guild.id, member.displayName, Buffer.concat(chunks));
      } catch (error) {
        console.error("Could not transcribe clip:", error);
      }
    });
  });
}

export async function handleClip(guildId, speakerName, audio, transcribe = whisperTranscribe) {
  // Whisper makes up words when it only hears a short noise.
  if (audio.length < ONE_SECOND_OF_AUDIO) return;

  const text = (await transcribe(audio)).trim();
  if (!text) return;

  addLine(guildId, speakerName, text);
  console.log(`${speakerName}: ${text}`);
}
