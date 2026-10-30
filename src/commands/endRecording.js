import { SlashCommandBuilder } from "discord.js";
import { getVoiceConnection } from "@discordjs/voice";
import { getSession } from "../scribe/sessions";

const command = {
  data: new SlashCommandBuilder()
    .setName("end-recording")
    .setDescription("Stop recording and leave the voice channel"),
  async execute(interaction) {
    const serverId = interaction.guild.id;
    const connection = getVoiceConnection(serverId);

    if (!connection) {
      return interaction.reply("No session is being recorded.");
    }

    connection.destroy();

    // The session stays in memory after the recording ends.
    const session = getSession(serverId);
    const minutes = Math.floor((Date.now() - session.startedAt) / 60000);
    return interaction.reply(
      `📜 Recording ended. Session length: ${minutes} minutes. ${session.lines.length} lines transcribed.`
    );
  },
};

export default command;
