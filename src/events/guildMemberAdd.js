import { EmbedBuilder, userMention } from "discord.js";

const CHANNEL_NAME = process.env.CHANNEL_NAME;
const MEME_URL = process.env.MEME_URL || "";

const event = {
  name: "guildMemberAdd",
  async execute(member) {
    const channel = member.guild.channels.cache.find(
      (channel) => channel.name === CHANNEL_NAME
    );

    const welcomeMessage = await getWelcomeMessageWithMeme(member.id);
    channel.send(welcomeMessage);
  },
};

const getWelcomeMessage = (userId) => {
  /*
    this function returns a welcome message.
    Play around with the code here and customise the welcome message.
  */
  return {
    content: `Welcome ${userMention(userId)}, to Dilshan's test server!
    Hope you have great time here!
  `,
  };
};

//
const getWelcomeMessageWithMeme = async (userId) => {
  /*
    this function returns a welcome message with a meme.
    Play around with the code here and customise the welcome message.

    TODO: Change this function to return different welcome message with a meme everytime a new user joins.
  */
  const meme = await getMeme();

  return {
    content: `Welcome ${userMention(userId)}, to Dilshan's test server!
    Here's a meme for you to enjoy!`,
    embeds: [meme],
  };
};

const getMeme = async () => {
  /*
    this function returns a meme.

    TODO: change this function to return a different meme randomly everytime a new user joins.
  */
  return new EmbedBuilder().setImage(MEME_URL);
};

export default event;
