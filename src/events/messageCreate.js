// The !start-recording and !end-recording commands are now slash commands,
// see src/commands. This just logs messages for debugging.
const event = {
  name: "messageCreate",
  async execute(message) {
    console.log("Got message:", message.content);
  },
};

export default event;
