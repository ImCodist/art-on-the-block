const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { Event } = require("../modules/event_data");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("start")
        .setDescription("Start a new event in the current channel!")
        .addBooleanOption(option => option
            .setName("repeat")
            .setDescription("Repeats the event with a new prompt once it's finished."),
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .setDMPermission(false),

    async execute(interaction) {
        const client = interaction.client;

        const repeat = interaction.options.getBoolean("repeat");

        const event = new Event(interaction.guild.id, interaction.channel.id, undefined, {
            repeat: repeat,
        });

        await client.eventHandler.start(event);
        await interaction.reply({ content: "Starting a new event in this channel!", ephemeral: true });
    },
};