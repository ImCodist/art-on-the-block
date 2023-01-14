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

// Makes a string shorter while adding ... to fit string lengths.
const truncateString = (string, characters) => {
    if (string.length > characters) {
        return string.slice(0, characters - 3) + "...";
    }
    else {
        return string;
    }
};

// Creates an embed based on a submissions data.
const createSubmissionEmbed = async (submission, user, prompt = undefined) => {
    // Create the message for the submission.
    const submissionEmbed = new EmbedBuilder()
        .setTitle(`🖌️  ${user.username}'s submission.`)
        .setAuthor({ name: `${user.tag}`, iconURL: `${user.displayAvatarURL()}` })
        .setColor(colors.DEFAULT);

    if (prompt != undefined) {
        submissionEmbed.setFooter({ text: `${prompt}` });
    }

    // Set the image to the main attachment.
    const mainAttachment = submission.attachmentURLs[0];
    submissionEmbed.setImage(mainAttachment);

    // Set the description to be the message sent with the submission.
    if (submission.content != "") {
        submissionEmbed.setDescription(`"${submission.content}"`);
    }

    // TODO: Also add the additional attachments to the submissions message for viewing.
    return submissionEmbed;
};

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
            label: truncateString(eventData.prompt.description, 100),
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

    truncateString: truncateString,

    createSubmissionEmbed: createSubmissionEmbed,
    getEventSelector: getEventSelector,
};