const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { Event, Prompt } = require("../modules/event_data");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("create")
        .setDescription("Create a new event in the current channel.")
        .addStringOption(option => option
            .setName("prompt")
            .setDescription("Force a prompt to be used for this event."),
        )
        .addBooleanOption(option => option
            .setName("repeat")
            .setDescription("Repeats the event with a new prompt once it's finished."),
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .setDMPermission(false),

    async execute(interaction) {
        const client = interaction.client;

        const promptString = interaction.options.getString("prompt");
        const repeat = interaction.options.getBoolean("repeat");

        let prompt = undefined;
        if (promptString != undefined) {
            prompt = new Prompt(promptString, interaction.user.id);
        }

        const event = new Event(interaction.guild.id, interaction.channel.id, prompt, {
            repeat: repeat,
        });

        await client.eventHandler.start(event);
        await interaction.reply({ content: "Starting a new event in this channel!", ephemeral: true });
    },
};