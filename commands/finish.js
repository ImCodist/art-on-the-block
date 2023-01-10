const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ComponentType } = require("discord.js");
const messages = require("../modules/messages");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("finish")
        .setDescription("Force an event to finish earlier.")
        .addBooleanOption(option => option
            .setName("cancel-repeat")
            .setDescription("Stops the event from repeating."),
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .setDMPermission(false),

    async execute(interaction) {
        const client = interaction.client;
        const eventHandler = client.eventHandler;

        const cancelRepeat = interaction.options.getBoolean("cancel-repeat");

        // Get the user to select an event.
        const eventSelector = await messages.getEventSelector(interaction);
        if (eventSelector == undefined) {
            const errorEmbed = new EmbedBuilder()
            .setTitle("❌  No events to finish.")
            .setDescription("There are no active events to finish.")
            .setColor(messages.colors.ERROR);

            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            return;
        }

        // Send the message.
        const eventSelectEmbed = new EmbedBuilder()
            .setTitle("📜  Select an event.")
            .setDescription("Choose one of the below events to finish early.")
            .setColor(messages.colors.DEFAULT);

        const message = await interaction.reply({ embeds: [eventSelectEmbed], components: [eventSelector], ephemeral: true });

        // Wait for the user to select an option.
        const filter = (i) => {
            i.deferUpdate();
            return i.user.id === interaction.user.id;
        };

        message.awaitMessageComponent({ filter, componentType: ComponentType.StringSelect, time: 60000 })
            .then(async (eventSelectInteraction) => {
                const selectedIndex = parseInt(eventSelectInteraction.values[0]);
                const selected = eventHandler.events[selectedIndex];

                const confirmEmbed = new EmbedBuilder()
                    .setTitle("🏁  Forced the event to finish.")
                    .setDescription(`The event **${selected.prompt.description}** has been finished early.`)
                    .setColor(messages.colors.SUCCESS);

                if (cancelRepeat) {
                    selected.options.repeat = false;
                }

                // Finish the event early, then send a confirmation message.
                await eventHandler.finish(selected);
                await interaction.editReply({ embeds: [confirmEmbed], components: [] });
            })
            .catch(() => interaction.editReply({ embeds: [messages.timedOutEmbed], components: [] }));
    },
};