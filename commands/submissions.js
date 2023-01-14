const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ComponentType, ButtonBuilder, ButtonStyle } = require("discord.js");
const messages = require("../modules/messages");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("submissions")
        .setDescription("View and manage your submissions to events.")
        .setDMPermission(false),

    async execute(interaction) {
        const client = interaction.client;
        const eventHandler = client.eventHandler;

        // TODO: This code is straight up copied from message_dm.js, it should be moved into another file (Like messages.js) to prevent the same thing existing twice.
        // Find the events the user can participate in.
        const validEvents = [];

        for (const event of eventHandler.events) {
            // If it is not in this guild, ignore it.
            if (event.guildId != interaction.guild.id) continue;

            // Check if guild is avaliable.
            const guild = await client.guilds.fetch(event.guildId);
            if (!guild.available) continue;

            // Check if user is a member of the guild.
            const member = await guild.members.fetch(interaction.user.id).catch(console.error);
            if (member == undefined) continue;

            // Add the event to the valid events array.
            validEvents.push({
                event: event,
                guildName: guild.name,
            });
        }

        // Create a option for each of the valid events.
        const options = [];
        for (const i in validEvents) {
            const eventData = validEvents[i];

            if (interaction.user.id in eventData.event.submissions) {
                // If you've submitted for the event already show a different icon.
                const optionData = {
                    label: messages.truncateString(eventData.event.prompt.description, 100),
                    emoji: "🖼️",
                    value: `${i}`,
                };

                options.push(optionData);
            }
        }

        // If the user has no valid events, return.
        if (options.length <= 0) {
            const errorEmbed = new EmbedBuilder()
                .setTitle("❌  No submissions to view.")
                .setDescription("You have not submitted to any events in this guild.")
                .setColor(messages.colors.ERROR);

            // Send the message.
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            return;
        }

        // The options menu for selecting an event.
        const eventSelectRow = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId("eventSelect")
                    .setPlaceholder("Nothing Selected")
                    .addOptions(options),
            );

        // The main embed for selecting an event.
        const eventSelectEmbed = new EmbedBuilder()
            .setTitle("📜  Select an event.")
            .setDescription("Choose an event to view your submission for.")
            .setColor(messages.colors.DEFAULT);

        // Send the message.
        const message = await interaction.reply({ embeds: [eventSelectEmbed], components: [eventSelectRow], ephemeral: true });

        // Wait for an event to be selected.
        const filter = (i) => {
            return i.user.id === interaction.user.id;
        };

        message.awaitMessageComponent({ filter, componentType: ComponentType.StringSelect, time: 60000 })
            .then(async (eventSelectInteraction) => {
                // Get the event and submission that was selected.
                const selected = parseInt(eventSelectInteraction.values[0]);
                const eventData = validEvents[selected];
                const submission = eventData.event.submissions[interaction.user.id];

                // The submissions preview embed.
                const submissionEmbed = await messages.createSubmissionEmbed(submission, interaction.user, eventData.event.prompt);
                submissionEmbed.setFooter({ text: "This is what the submission will look like when shown." });

                // The buttons to manage said submission.
                const optionsRow = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId("deleteSubmission")
                            .setLabel("Remove")
                            .setStyle(ButtonStyle.Danger),
                    );

                await eventSelectInteraction.update({ embeds: [submissionEmbed], components: [optionsRow] });

                message.awaitMessageComponent({ filter, componentType: ComponentType.Button, time: 60000 })
                    .then(async (optionSelectInteraction) => {
                        eventData.event.removeSubmission(interaction.user.id);
                        eventHandler.save();

                        // The main embed for selecting an event.
                        const removeEmbed = new EmbedBuilder()
                            .setTitle("🗑️  Removed submission.")
                            .setDescription("Successfully removed your submission from the event.")
                            .setColor(messages.colors.SUCCESS);

                        optionSelectInteraction.update({ embeds: [removeEmbed], components: [] });
                    })
                    .catch(() => interaction.editReply({ embeds: [messages.timedOutEmbed], components: [] }));
            })
            .catch(() => interaction.editReply({ embeds: [messages.timedOutEmbed], components: [] }));
    },
};