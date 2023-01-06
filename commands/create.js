const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { Event } = require("../modules/event_data");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("start")
        .setDescription("Start an event in the current channel.")
        .addBooleanOption(option => option
            .setName("repeat")
            .setDescription("Whether the event will repeat once the previous one ends."))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .setDMPermission(false),

    async execute(interaction) {
        const client = interaction.client;

        const repeat = interaction.options.getBoolean("repeat") ?? false;

        const event = new Event(interaction.guild.id, interaction.channel.id, undefined, { "repeat": repeat });

        await client.eventHandler.start(event);

        await interaction.reply("Started an event!");
    },
};