const { Events, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require("discord.js");
const messages = require("../modules/messages");
const { Submission } = require("../modules/event_data");

module.exports = {
	name: Events.MessageCreate,

	async execute(message) {
        const client = message.client;

		if (message.author.bot) return;
        if (message.guild !== null) return;

        if (message.attachments.size <= 0) return;

        const validEvents = [];

        const eventHandler = client.eventHandler;
        for (const i in eventHandler.events) {
            const event = eventHandler.events[i];

            const guild = await client.guilds.fetch(event.guildId);
            if (!guild.available) continue;

            const member = await guild.members.resolve(message.author.id);
            if (!member) continue;

            validEvents.push({
                event: event,
                guildName: guild.name,
            });
        }

        if (validEvents.length <= 0) return;

        const options = [];
        for (const i in validEvents) {
            const eventData = validEvents[i];

            const optionData = {
                label: eventData.event.prompt.description,
                description: eventData.guildName,
                emoji: "📷",
                value: `${i}`,
            };

            if (message.author.id in eventData.event.submissions) {
                optionData.emoji = "🖼️";
            }

            options.push(optionData);
        }

        const eventSelectEmbed = new EmbedBuilder()
            .setTitle("📷 Select Event")
            .setDescription("Which event would you like to submit this artwork to?\n*Select from the menu below.*")
            .setColor(messages.colors.CONFIRM);

        const attachment = message.attachments.at(0);

        if (attachment.contentType != null && attachment.contentType.startsWith("image") && "url" in attachment) {
            eventSelectEmbed.setImage(attachment.url);
        }
        else {
            return;
        }

        const eventSelectRow = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId("eventSelect")
                    .setPlaceholder("Nothing Selected")
                    .addOptions(options),
            );

        const eventSelectMessage = await message.channel.send({ embeds: [eventSelectEmbed], components: [eventSelectRow] });

        client.on(Events.InteractionCreate, async interactionSelect => {
            if (!interactionSelect.isStringSelectMenu()) return;
            if (interactionSelect.message.id !== eventSelectMessage.id) return;
            if (interactionSelect.custom_id === "eventSelect") return;

            const selected = parseInt(interactionSelect.values[0]);
            const eventData = validEvents[selected];

            const submission = new Submission(message);
            eventData.event.addSubmission(submission, message.author.id);
            eventHandler.save();

            const eventConfirmEmbed = eventSelectEmbed
                .setTitle("🖼️ Submitted artwork!")
                .setDescription(`Submitted your art to the event **"${eventData.event.prompt.description}"**!`)
                .setColor(messages.colors.SUCCESS);

            const eventConfirmRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId("submitPrompt")
                        .setLabel("Submit a prompt")
                        .setStyle(ButtonStyle.Primary),
                );

            await interactionSelect.update({ embeds: [eventConfirmEmbed], components: [eventConfirmRow] });

            client.on(Events.InteractionCreate, async interactionButton => {
                if (!interactionButton.isButton()) return;
                if (interactionButton.message.id !== eventSelectMessage.id) return;
                if (interactionButton.custom_id === "submitPrompt") return;

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

                await interactionButton.showModal(modal);

                client.on(Events.InteractionCreate, async interactionModal => {
                    if (!interactionModal.isModalSubmit()) return;
                    if (interactionModal.message.id !== eventSelectMessage.id) return;
                    if (interactionModal.custom_id === "promptModal") return;

                    const prompt = interactionModal.fields.getTextInputValue("promptInput");
                    submission.promptDescription = prompt;
                    eventHandler.save();

                    const promptConfirmEmbed = new EmbedBuilder()
                        .setTitle("📋 Submitted prompt!")
                        .setDescription(`Submitted your prompt **"${prompt}"** as a possible future event!`)
                        .setColor(messages.colors.SUCCESS);

                    await interactionSelect.editReply({ components: [] });
                    await interactionModal.reply({ embeds: [promptConfirmEmbed] });
                });
            });
        });
    },
};