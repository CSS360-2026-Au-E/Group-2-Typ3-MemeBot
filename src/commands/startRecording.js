import { SlashCommandBuilder } from "discord.js";
import { joinVoiceChannel } from "@discordjs/voice";
import { isInOtherChannel } from "../music/player";
import { getSession, startSession } from "../scribe/sessions";
import { listenToSpeakers } from "../scribe/listen";

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

    if (getSession(serverId)) {
      return interaction.reply("A session is already being recorded.");
    }

    if (isInOtherChannel(voiceChannel)) {
      return interaction.reply(
        "I'm playing music in another voice channel. Join me there or use /stop-music first."
      );
    }

    const connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: serverId,
      adapterCreator: interaction.guild.voiceAdapterCreator,
      selfDeaf: false, // the bot has to hear people to transcribe them
    });
    startSession(serverId);
    listenToSpeakers(connection, interaction.guild);

    return interaction.reply("🎙️ Recording started! The scribe is listening.");
  },
};

export default command;
