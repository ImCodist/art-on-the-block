const { Events } = require("discord.js");

module.exports = {
    name: Events.InteractionCreate,

    async execute(interaction) {
        const client = interaction.client;

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
                console.error(`Error executing ${interaction.commandName}.`);
                console.error(error);

                await interaction.reply({
                    content: `Something went wrong while executing this command.\n\`\`\`${error}\`\`\``,
                    ephemeral: true,
                });
            }
        }
    },
};