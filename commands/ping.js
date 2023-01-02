const { SlashCommandBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("ping")
        .setDescription("Replies with Pong!"),

    async execute(interaction) {
        const grenyer = 22;
        print(grenyer);

        await interaction.reply("Pong!");
    },
};