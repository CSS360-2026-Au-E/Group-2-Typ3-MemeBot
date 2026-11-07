import { SlashCommandBuilder } from "discord.js";
import { getSession } from "../scribe/sessions";

const command = {
  data: new SlashCommandBuilder()
    .setName("status")
    .setDescription("Check if the scribe is recording and for how long"),
  async execute(interaction) {
    const serverId = interaction.guild.id;
    const session = getSession(serverId);

    if (!session) {
      return interaction.reply(
        "⏸️ Not recording right now. Use /start-recording to begin a session."
      );
    }

    const minutes = Math.floor((Date.now() - session.startedAt) / 60000);
    return interaction.reply(
      `🎙️ Recording for ${minutes} minutes. ${session.lines.length} lines transcribed so far.`
    );
  },
};

export default command;
