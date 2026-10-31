import { expect } from "chai";
import interactionCreate from "../src/events/interactionCreate";

const fakeInteraction = ({ commandName, isCommand = true }) => {
  const interaction = {
    commandName,
    isChatInputCommand: () => isCommand,
    guild: { id: "guild-1" },
    replies: [],
    reply: async (message) => interaction.replies.push(message),
  };
  return interaction;
};

describe("interactionCreate", () => {
  it("runs the slash command with the matching name", async () => {
    const interaction = fakeInteraction({ commandName: "end-recording" });

    await interactionCreate.execute(interaction);

    expect(interaction.replies).to.deep.equal(["No session is being recorded."]);
  });

  it("ignores interactions that are not slash commands", async () => {
    const interaction = fakeInteraction({
      commandName: "end-recording",
      isCommand: false,
    });

    await interactionCreate.execute(interaction);

    expect(interaction.replies).to.deep.equal([]);
  });
});
