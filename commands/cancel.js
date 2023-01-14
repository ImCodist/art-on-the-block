const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ComponentType } = require("discord.js");
const messages = require("../modules/messages");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("cancel")
        .setDescription("Cancel an event early.")
        .addBooleanOption(option => option
            .setName("send-message")
            .setDescription("Send a message to notify users of the events cancelation."),
        )
        .addBooleanOption(option => option
            .setName("do-repeat")
            .setDescription("Repeat the event after being cancelled if it has the repeat option."),
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .setDMPermission(false),

    async execute(interaction) {
        const client = interaction.client;
        const eventHandler = client.eventHandler;

        const sendMessage = interaction.options.getBoolean("send-message") ?? true;
        const doRepeat = interaction.options.getBoolean("do-repeat") ?? false;

        // Get the user to select an event.
        const eventSelector = await messages.getEventSelector(interaction);
        if (eventSelector == undefined) {
            const errorEmbed = new EmbedBuilder()
                .setTitle("❌  No events to cancel.")
                .setDescription("There are no active events to cancel.")
                .setColor(messages.colors.ERROR);

            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            return;
        }

        // Send the message.
        const eventSelectEmbed = new EmbedBuilder()
            .setTitle("📜  Select an event.")
            .setDescription("Choose one of the below events to cancel early.")
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
                    .setTitle("🏁  Cancelled the event early.")
                    .setDescription(`The event **${messages.truncateString(selected.prompt.description, 100)}** has been cancelled.`)
                    .setColor(messages.colors.SUCCESS);

                if (!doRepeat) {
                    selected.options.repeat = false;
                }

                // Finish the event early, then send a confirmation message.
                await eventHandler.cancel(selected, sendMessage);
                await interaction.editReply({ embeds: [confirmEmbed], components: [] });
            })
            .catch(() => interaction.editReply({ embeds: [messages.timedOutEmbed], components: [] }));
    },
};