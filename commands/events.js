const { SlashCommandBuilder, EmbedBuilder, ComponentType, PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require("discord.js");
const messages = require("../modules/messages");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("events")
        .setDescription("View and manage events in this guild.")
        .setDMPermission(false),

    async execute(interaction) {
        const client = interaction.client;
        const eventHandler = client.eventHandler;

        // Get the user to select an event.
        const eventSelector = await messages.getEventSelector(interaction);
        if (eventSelector == undefined) {
            const errorEmbed = new EmbedBuilder()
                .setTitle("❌  No events found.")
                .setDescription("There are no running events in this guild.\nCreate an event using **/create**!")
                .setColor(messages.colors.ERROR);

            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            return;
        }

        // Send the message.
        const eventSelectEmbed = new EmbedBuilder()
            .setTitle("📃  Select an event...")
            .setDescription("Choose one of the events from the select menu below to view / manage.")
            .setColor(messages.colors.DEFAULT);

        const message = await interaction.reply({ embeds: [eventSelectEmbed], components: [eventSelector], ephemeral: true });

        // Wait for the user to select an option.
        const filter = (i) => {
            return i.user.id === interaction.user.id;
        };

        message.awaitMessageComponent({ filter, componentType: ComponentType.StringSelect, time: 60000 })
            .then(async (eventSelectInteraction) => {
                const selectedIndex = parseInt(eventSelectInteraction.values[0]);

                // Get the event & member who ran the command.
                const event = eventHandler.events[selectedIndex];
                const member = interaction.member;

                // Create the info about the event.
                const infoEmbed = await messages.createEventEmbed(event);

                // Create the buttons to manage the event.
                const components = [];
                const optionsRow = new ActionRowBuilder();

                if (member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
                    optionsRow.addComponents(
                        new ButtonBuilder()
                            .setCustomId("finishEvent")
                            .setLabel("Finish")
                            .setStyle(ButtonStyle.Primary),
                        new ButtonBuilder()
                            .setCustomId("cancelEvent")
                            .setLabel("Cancel")
                            .setStyle(ButtonStyle.Danger),
                    );
                }

                if (optionsRow.components.length > 0) {
                    components.push(optionsRow);
                }

                // Update the message to show the information.
                await eventSelectInteraction.update({ embeds: [infoEmbed], components: components });

                // Wait for a button to be pressed.
                message.awaitMessageComponent({ filter, componentType: ComponentType.Button, time: 60000 })
                    .then(async (optionSelectInteraction) => {
                        // Do an action based on the button pressed.
                        switch (optionSelectInteraction.customId) {
                            case "finishEvent": {
                                // Finish the event.
                                await eventHandler.finish(event);

                                // Send the confirmation message.
                                const finishEventEmbed = new EmbedBuilder()
                                    .setTitle("🏁  Finished the event early.")
                                    .setDescription(`Successfully finished the event **"${messages.truncateString(event.prompt.description, 500)}"** early.\n\n*If the event had the **repeat** option on, it'll repeat like normal.*`)
                                    .setColor(messages.colors.CONFIRM);

                                await optionSelectInteraction.update({ embeds: [finishEventEmbed], components: [] });
                                break;
                            }
                            case "cancelEvent": {
                                // Create the confirmation modal.
                                const confirmModal = new ModalBuilder()
                                    .setCustomId("confirmModal")
                                    .setTitle("This will DELETE the event, are you sure?");

                                // Create the text input components
                                const confirmNameInput = new TextInputBuilder()
                                    .setCustomId("confirmNameInput")
                                    .setLabel("Please enter \"YES\" to continue.")
                                    .setStyle(TextInputStyle.Short);

                                // Add the confirmation text input to a row and then to the modal.
                                const firstActionRow = new ActionRowBuilder().addComponents(confirmNameInput);
                                confirmModal.addComponents(firstActionRow);

                                // Show the modal.
                                await optionSelectInteraction.showModal(confirmModal);
                                await interaction.editReply({ components: [] });

                                // Wait for the modal to be submitted.
                                const modalFilter = (i) => {
                                    return i.customId === "confirmModal" && i.member.id === interaction.user.id;
                                };

                                optionSelectInteraction.awaitModalSubmit({ modalFilter, time: 60000 })
                                    .then(async (modalInteraction) => {
                                        const confirmText = modalInteraction.fields.getTextInputValue("confirmNameInput");

                                        if (confirmText.toLowerCase() == "yes") {
                                            // Cancel the event.
                                            await eventHandler.cancel(event);

                                            // Send the confirmation message.
                                            const cancelEventEmbed = new EmbedBuilder()
                                                .setTitle("🗑️  Cancelled the event.")
                                                .setDescription(`Successfully cancelled the event **"${messages.truncateString(event.prompt.description, 500)}"**.`)
                                                .setColor(messages.colors.CONFIRM);

                                            await modalInteraction.update({ embeds: [cancelEventEmbed], components: [] });
                                        }
                                        else {
                                            await modalInteraction.update({ components: [] });
                                        }
                                    })
                                    .catch(() => interaction.editReply({ components: [] }));
                                break;
                            }
                        }
                    })
                    .catch(() => interaction.editReply({ components: [] }));
            })
            .catch(() => interaction.editReply({ embeds: [messages.timedOutEmbed], components: [] }));
    },
};