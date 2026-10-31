import { SlashCommandBuilder } from "discord.js";
import { getVoiceConnection, joinVoiceChannel } from "@discordjs/voice";
import { startSession } from "../scribe/sessions";

const command = {
  data: new SlashCommandBuilder()
    .setName("start-recording")
    .setDescription("Join your voice channel and start recording the session"),
  async execute(interaction) {
    const serverId = interaction.guild.id;
    const voiceChannel = interaction.member.voice.channel;

    if (!voiceChannel) {
      return interaction.reply("Join a voice channel first.");
    }

    if (getVoiceConnection(serverId)) {
      return interaction.reply("A session is already being recorded.");
    }

    joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: serverId,
      adapterCreator: interaction.guild.voiceAdapterCreator,
      selfDeaf: false, // the bot has to hear people to transcribe them
    });
    startSession(serverId);

    return interaction.reply("🎙️ Recording started! The scribe is listening.");
  },
};

export default command;
