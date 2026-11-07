import fs from "fs";
import { AttachmentBuilder, SlashCommandBuilder } from "discord.js";
import { getVoiceConnection } from "@discordjs/voice";
import { isMusicPlaying } from "../music/player";
import { endSession, getSession } from "../scribe/sessions";

const command = {
  data: new SlashCommandBuilder()
    .setName("end-recording")
    .setDescription("Stop recording and post the transcript"),
  async execute(interaction) {
    const serverId = interaction.guild.id;
    const session = getSession(serverId);

    if (!session) {
      return interaction.reply("No session is being recorded.");
    }

    endSession(serverId);

    // Let the music finish. The bot leaves voice when it does.
    if (!isMusicPlaying(serverId)) {
      getVoiceConnection(serverId)?.destroy();
    }

    const minutes = Math.floor((Date.now() - session.startedAt) / 60000);

    // Turn the lines into text, like "Leo: I open the door."
    const text = session.lines.map((line) => `${line.speaker}: ${line.text}`).join("\n");

    // Save the session to the data folder so it isn't lost.
    fs.mkdirSync("data", { recursive: true });
    fs.writeFileSync(`data/${serverId}-${session.startedAt}.json`, JSON.stringify(session));

    // Post the transcript as a text file.
    const file = new AttachmentBuilder(Buffer.from(text || "Nothing was transcribed."), {
      name: "transcript.txt",
    });

    return interaction.reply({
      content: `📜 Recording ended. Session length: ${minutes} minutes. Transcript saved.`,
      files: [file],
    });
  },
};

export default command;
