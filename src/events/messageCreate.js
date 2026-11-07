import { playLinkFromMessage } from "../music/player";

// The !start-recording and !end-recording commands are now slash commands,
// see src/commands. This logs messages for debugging and plays YouTube links.
const event = {
  name: "messageCreate",
  async execute(message) {
    console.log("Got message:", message.content);

    try {
      await playLinkFromMessage(message);
    } catch (error) {
      // Log instead of crashing the whole bot when a link can't be played.
      console.error("Could not play link:", error);
    }
  },
};

export default event;
