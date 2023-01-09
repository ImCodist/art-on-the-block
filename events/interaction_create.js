// Requires
const { Events, codeBlock } = require("discord.js");

module.exports = {
    name: Events.InteractionCreate,

    async execute(interaction) {
        // Store the client for later.
        const client = interaction.client;

        // Check if it is a command.
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);

            if (!command) {
                console.error(`No slash commmand named "${interaction.commandName}" exists.`);
                return;
            }

            try {
                await command.execute(interaction);
            }
            catch (error) {
                console.error(`Error executing the slash command "${interaction.commandName}".`);
                console.error(error);

                await interaction.reply({
                    content: `Something went wrong while executing this command.\n${codeBlock(error)}`,
                    ephemeral: true,
                });
            }
        }
    },
};