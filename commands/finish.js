const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ComponentType } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("finish")
        .setDescription("Force an event to finish earlier.")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .setDMPermission(false),

    async execute(interaction) {
        const client = interaction.client;
        const eventHandler = client.eventHandler;

        // Get all the events in the guild.
        const events = [];
        for (const event of eventHandler.events) {
            if (interaction.guild.id == event.guildId) {
                events.push(event);
            }
        }

        // Make sure there are events to finish.
        if (events.length <= 0) {
            const errorEmbed = new EmbedBuilder()
                .setTitle("No events to finish.");

            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            return;
        }

        // Create option data for each of the events.
        const options = [];
        for (const i in events) {
            const eventData = events[i];

            const optionData = {
                label: eventData.prompt.description,
                value: `${i}`,
            };

            options.push(optionData);
        }

        // The options menu for selecting an event.
        const eventSelectRow = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId("eventSelect")
                    .setPlaceholder("Nothing Selected")
                    .addOptions(options),
            );

        // Send the message.
        const eventSelectEmbed = new EmbedBuilder()
            .setTitle("Select a event");

        const message = await interaction.reply({ embeds: [eventSelectEmbed], components: [eventSelectRow], ephemeral: true });

        // Wait for the user to select an option.
        const filter = (i) => {
            i.deferUpdate();
            return i.user.id === interaction.user.id;
        };

        message.awaitMessageComponent({ filter, componentType: ComponentType.StringSelect, time: 60000 })
            .then(async (eventSelectInteraction) => {
                const selectedIndex = parseInt(eventSelectInteraction.values[0]);
                const selected = events[selectedIndex];

                const confirmEmbed = new EmbedBuilder()
                    .setTitle("forced event to finish");

                // Finish the event early, then send a confirmation message.
                await eventHandler.finish(selected);
                await interaction.editReply({ embeds: [confirmEmbed], components: [] });
            })
            .catch(err => console.error(err));
    },
};