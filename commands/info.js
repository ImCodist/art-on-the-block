const { SlashCommandBuilder, EmbedBuilder, ComponentType } = require("discord.js");
const messages = require("../modules/messages");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("info")
        .setDescription("Get information on a servers events.")
        .setDMPermission(false),

    async execute(interaction) {
        const client = interaction.client;
        const eventHandler = client.eventHandler;

        // Get the user to select an event.
        const eventSelector = await messages.getEventSelector(interaction);
        if (eventSelector == undefined) {
            const errorEmbed = new EmbedBuilder()
            .setTitle("❌  No events to view.")
            .setDescription("There are no active events to view.")
            .setColor(messages.colors.ERROR);

            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            return;
        }

        // Send the message.
        const eventSelectEmbed = new EmbedBuilder()
            .setTitle("📜  Select an event.")
            .setDescription("Choose one of the below events to view info about.")
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
                const event = eventHandler.events[selectedIndex];

                const infoEmbed = new EmbedBuilder()
                    .setTitle(`${event.prompt.description}`)
                    .addFields(
                        { name: "Finish Time", value: `<t:${event.finishTime / 1000}>`, inline: true },
                        { name: "Submissions", value: `${Object.keys(event.submissions).length}`, inline: true },
                    )
                    .setColor(messages.colors.DEFAULT);

                if (event.prompt.authorId != undefined) {
                    infoEmbed.addFields(
                        { name: "Author", value: `<@${event.prompt.authorId}>`, inline: true },
                    );
                }

                if (Object.keys(event.options).length > 0) {
                    let optionsMessage = "";
                    if ("repeat" in event.options && event.options.repeat == true) optionsMessage += "✅ **REPEAT**";

                    if (optionsMessage != "") {
                        infoEmbed.addFields(
                            { name: "Options", value: optionsMessage, inline: false },
                        );
                    }
                }

                // Finish the event early, then send a confirmation message.
                await interaction.editReply({ embeds: [infoEmbed], components: [] });
            })
            .catch(() => interaction.editReply({ embeds: [messages.timedOutEmbed], components: [] }));
    },
};