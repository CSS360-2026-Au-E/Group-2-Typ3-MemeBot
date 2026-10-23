import { EmbedBuilder } from "discord.js";

const CHANNEL_NAME = process.env.CHANNEL_NAME;
const MEME_URL = process.env.MEME_URL || "";

const event = {
  name: "ready",
  once: true,
  async execute(client) {
    console.log(`
    ############################################################
    #  Logged in as ${client.user.username}!
    #  Serving ${client.guilds.cache.size} servers.
    #  Serving ${client.users.cache.size} users.
    ############################################################
  `);

    const meme = new EmbedBuilder().setImage(MEME_URL);
    for (const guild of client.guilds.cache.values()) {
      const channel = guild.channels.cache.find(
        (channel) => channel.name === CHANNEL_NAME
      );

      if (channel) {
        await channel.send({ content: "I'm ready!", embeds: [meme] });
      }
    }
  },
};

export default event;