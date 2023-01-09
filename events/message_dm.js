// Requires
const { Events, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require("discord.js");
const messages = require("../modules/messages");
const { Submission } = require("../modules/event_data");

module.exports = {
	name: Events.MessageCreate,

	async execute(message) {
        // ugh i hate this codeeee
        // well, might aswell get through it

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
        // TODO: I think this straight up doesn't work sometimes, do I know why... I think you know the answer to that.
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
                label: eventData.event.prompt.description,
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
            .setTitle("📷 Select Event")
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

        // heres the reason i hate this file, gahhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhh
        // Wait for a event to be selected.
        client.on(Events.InteractionCreate, async (interactionSelect) => {
            // Make sure this is the correct select menu. (probably doesn't work)
            if (!interactionSelect.isStringSelectMenu()) return;
            if (interactionSelect.message.id !== eventSelectMessage.id) return;
            if (interactionSelect.custom_id === "eventSelect") return;

            // Get the event that was selected.
            const selected = parseInt(interactionSelect.values[0]);
            const eventData = validEvents[selected];

            // Create the submission and add it to the event!
            const submission = new Submission(message);
            eventData.event.addSubmission(submission, message.author.id);
            eventHandler.save();

            // Create the embed for the artwork being confirmed.
            const eventConfirmEmbed = eventSelectEmbed
                .setTitle("🖼️ Submitted artwork!")
                .setDescription(`Submitted your art to the event **"${eventData.event.prompt.description}"**!`)
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
            await interactionSelect.update({ embeds: [eventConfirmEmbed], components: [eventConfirmRow] });

            // Check for a button interaction grahhhhhhhhhhhhhhhh
            client.on(Events.InteractionCreate, async (interactionButton) => {
                // Make sure it's the correct button.
                if (!interactionButton.isButton()) return;
                if (interactionButton.message.id !== eventSelectMessage.id) return;
                if (interactionButton.custom_id === "submitPrompt") return;

                // Create a modal for entering a prompt.
                const modal = new ModalBuilder()
                    .setCustomId("promptModal")
                    .setTitle("Submit a Prompt");

                const promptInput = new TextInputBuilder()
                    .setCustomId("promptInput")
                    .setLabel("Write a prompt for the next drawing event!")
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder("Ex. Draw yourself doing a backflip!")
                    .setRequired(false);

                const row = new ActionRowBuilder().addComponents(promptInput);
                modal.addComponents(row);

                // Show the modal to the user.
                await interactionButton.showModal(modal);

                // Wait for the modal to be submitted holy f DO YOU SEE WHY I HATE THIS
                client.on(Events.InteractionCreate, async (interactionModal) => {
                    // Make sure it s hte co rerc t modal.
                    if (!interactionModal.isModalSubmit()) return;
                    if (interactionModal.message.id !== eventSelectMessage.id) return;
                    if (interactionModal.custom_id === "promptModal") return;

                    // Get the prompt and set the submissions prompt description to this.
                    const prompt = interactionModal.fields.getTextInputValue("promptInput");
                    submission.promptDescription = prompt;
                    eventHandler.save();

                    // Show the user it has been submitted.
                    const promptConfirmEmbed = new EmbedBuilder()
                        .setTitle("📋 Submitted prompt!")
                        .setDescription(`Submitted your prompt **"${prompt}"** as a possible future event!`)
                        .setColor(messages.colors.SUCCESS);

                    // Uh
                    await interactionSelect.editReply({ components: [] });
                    await interactionModal.reply({ embeds: [promptConfirmEmbed] });
                });
            });
        });
    },
};