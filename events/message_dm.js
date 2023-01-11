// Requires
const { Events, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, ComponentType } = require("discord.js");
const messages = require("../modules/messages");
const { Submission } = require("../modules/event_data");

module.exports = {
	name: Events.MessageCreate,

	async execute(message) {
        // Get the client & event handler for future use.
        const client = message.client;
        const eventHandler = client.eventHandler;

        // Make sure the user meets the requirements to submit.
		if (message.author.bot) return;
        if (message.guild !== null) return;

        if (message.attachments.size <= 0) return;

        // Get the main attachment that'll show up.
        let mainAttachment = undefined;

        for (const attachment of message.attachments.values()) {
            if (attachment.contentType != null && attachment.contentType.startsWith("image") && "url" in attachment) {
                mainAttachment = attachment;
                break;
            }
        }

        // If there are no valid attachments, return.
        if (mainAttachment == undefined) return;

        // Find the events the user can participate in.
        // TODO: I think this straight up doesn't work sometimes, do I know why?... I think you know the answer to that.
        const validEvents = [];

        for (const event of eventHandler.events) {
            // Check if guild is avaliable.
            const guild = await client.guilds.fetch(event.guildId);
            if (!guild.available) continue;

            // Check if user is a member of the guild.
            const member = await guild.members.fetch(message.author.id).catch(console.error);
            if (member == undefined) continue;

            // Add the event to the valid events array.
            validEvents.push({
                event: event,
                guildName: guild.name,
            });
        }

        // If the user has no valid events, return.
        if (validEvents.length <= 0) return;

        // Create a option for each of the valid events.
        const options = [];
        for (const i in validEvents) {
            const eventData = validEvents[i];

            const optionData = {
                label: messages.truncateString(eventData.event.prompt.description, 100),
                description: eventData.guildName,
                emoji: "📷",
                value: `${i}`,
            };

            // If you've submitted for the event already show a different icon.
            if (message.author.id in eventData.event.submissions) {
                optionData.emoji = "🖼️";
            }

            options.push(optionData);
        }

        // The main embed for selecting an event.
        const eventSelectEmbed = new EmbedBuilder()
            .setTitle("📷  Select Event")
            .setDescription("Which event would you like to submit this artwork to?\n*Select from the menu below.*")
            .setColor(messages.colors.CONFIRM);

        eventSelectEmbed.setImage(mainAttachment.url);

        // The options menu for selecting an event.
        const eventSelectRow = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId("eventSelect")
                    .setPlaceholder("Nothing Selected")
                    .addOptions(options),
            );

        // Send the message.
        const eventSelectMessage = await message.channel.send({ embeds: [eventSelectEmbed], components: [eventSelectRow] });

        // Wait for an event to be selected.
        const filter = (i) => {
            return i.user.id === message.author.id;
        };

        eventSelectMessage.awaitMessageComponent({ filter, componentType: ComponentType.StringSelect, time: 60000 })
            .then(async (eventSelectInteraction) => {
                // Get the event that was selected.
                const selected = parseInt(eventSelectInteraction.values[0]);
                const eventData = validEvents[selected];

                // Create the submission and add it to the event!
                const submission = new Submission(message);
                eventData.event.addSubmission(submission, message.author.id);
                eventHandler.save();

                // Create the embed for the artwork being confirmed.
                const eventConfirmEmbed = eventSelectEmbed
                    .setTitle("🖼️ Submitted artwork!")
                    .setDescription(`Submitted your art to the event **${messages.truncateString(eventData.event.prompt.description, 100)}**`)
                    .setColor(messages.colors.SUCCESS);

                // Create the button for choosing to add a prompt as well.
                const eventConfirmRow = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId("submitPrompt")
                            .setLabel("Submit a prompt")
                            .setStyle(ButtonStyle.Primary),
                    );

                // Update the original message.
                await eventSelectInteraction.update({ embeds: [eventConfirmEmbed], components: [eventConfirmRow] });

                // Check for a button interaction
                eventSelectMessage.awaitMessageComponent({ filter, componentType: ComponentType.Button, time: 60000 })
                    .then(async (promptSelectInteraction) => {
                        // Create a modal for entering a prompt.
                        const modal = new ModalBuilder()
                            .setCustomId("promptModal")
                            .setTitle("Submit a Prompt");

                        const promptInput = new TextInputBuilder()
                            .setCustomId("promptInput")
                            .setLabel("Write a prompt for the next drawing event!")
                            .setStyle(TextInputStyle.Short)
                            .setPlaceholder("Ex. Draw yourself doing a backflip!")
                            .setRequired(true)
                            .setMaxLength(500);

                        const row = new ActionRowBuilder().addComponents(promptInput);
                        modal.addComponents(row);

                        // Show the modal to the user.
                        await promptSelectInteraction.showModal(modal);

                        // Wait for the modal to be submitted.
                        const modalFilter = (i) => {
                            return i.customId === "promptModal" && i.member.id === message.author.id;
                        };

                        promptSelectInteraction.awaitModalSubmit({ modalFilter, time: 60000 })
                            .then(async (modalInteraction) => {
                                // Get the prompt and set the submissions prompt description to this.
                                const prompt = modalInteraction.fields.getTextInputValue("promptInput");
                                submission.promptDescription = prompt;
                                eventHandler.save();

                                // Show the user it has been submitted.
                                const promptConfirmEmbed = new EmbedBuilder()
                                    .setTitle("📋  Submitted prompt!")
                                    .setDescription(`Submitted your prompt **${prompt}** as a possible future event!`)
                                    .setColor(messages.colors.SUCCESS);

                                // Uh
                                await eventSelectInteraction.editReply({ components: [] });
                                await modalInteraction.reply({ embeds: [promptConfirmEmbed] });
                            })
                            .catch(() => eventSelectMessage.edit({ components: [] }));
                    })
                    .catch(() => eventSelectMessage.edit({ components: [] }));
            })
            .catch(() => eventSelectMessage.edit({ embeds: [messages.timedOutEmbed], components: [] }));
    },
};