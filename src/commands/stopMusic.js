import { SlashCommandBuilder } from "discord.js";
import { stopMusic } from "../music/player";

const command = {
  data: new SlashCommandBuilder()
    .setName("stop-music")
    .setDescription("Stop the music that's playing"),
  async execute(interaction) {
    if (!stopMusic(interaction.guild.id)) {
      return interaction.reply("No music is playing.");
    }

    return interaction.reply("⏹️ Music stopped.");
  },
};

export default command;
