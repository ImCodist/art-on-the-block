/**
 * messages.js
 * codist
 *
 * Holds functions I may use a lot for user interface stuff.
 * Also holds information for keeping embeds consistent.
 */

// Requires
const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require("discord.js");

// Embed color palette.
const colors = {
    DEFAULT: "#5865F2",
    CONFIRM: "#FEE75C",
    SUCCESS: "#57F287",
    MESSAGE: "#FFFFFF",
    ERROR: "#ED4245",
};

// A timed out message for events.
// The embed that gets shown when timed out.
const timedOutEmbed = new EmbedBuilder()
    .setTitle("⏰  Timed out.")
    .setDescription("Took too long to respond.")
    .setColor(colors.ERROR);

// Useful for when the user needs to select an event.
const getEventSelector = async (interaction) => {
    const client = interaction.client;
    const eventHandler = client.eventHandler;

    // Get all the events in the guild.
    const events = {};
    for (const i in eventHandler.events) {
        const event = eventHandler.events[i];

        if (interaction.guild.id == event.guildId) {
            events[i] = event;
        }
    }

    // Make sure there are events to finish.
    if (Object.keys(events).length <= 0) {
        return undefined;
    }

    // Create option data for each of the events.
    const options = [];
    for (const i of Object.keys(events)) {
        const eventData = events[i];

        const optionData = {
            label: eventData.prompt.description,
            emoji: "📅",
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

    return eventSelectRow;
};

module.exports = {
    colors: colors,

    timedOutEmbed: timedOutEmbed,

    getEventSelector: getEventSelector,
};