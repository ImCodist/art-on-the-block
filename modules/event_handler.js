/**
 * event_handler.js
 * codist
 *
 * The event handler makes sure events are finished and removed at the correct times.
 * It stores each active event and allows easy addition and removal.
 * Messages for event creation, and finishing are also done here.
 */

// Requires
const fs = require("node:fs");
const path = require("node:path");
const { EmbedBuilder, time, ThreadAutoArchiveDuration } = require("discord.js");
const dotenv = require("dotenv");

const { Event } = require("./event_data");
const messages = require("./messages");

// The path to save guild's event data at.
const eventDataPath = "./data";

// Load the .env file.
dotenv.config();

// Contains events and updates them accordingly.
class EventHandler {
    constructor(client) {
        // The discord.js client this event handler runs on.
        this.client = client;

        // Each event is stored in this array.
        this.events = [];

        // Setup a timer for checking each events status.
        this.updateTimer = setInterval(() => {
            this.update();
        }, 500);

        // Load the data at the eventDataPath.
        this.load();
    }

    // Gets run every x ms and checks the status of each event.
    update() {
        for (const event of this.events) {
            // If the event is past its finish date.
            if (event.finishTime < Date.now()) {
                this.finish(event);
            }
        }
    }

    // Adds a new event, then displays a message.
    async start(event) {
        // Add the event.
        const addError = this.addEvent(event);
        if (addError instanceof Error) return addError;

        this.save();

        // Create the start message.
        const embed = new EmbedBuilder()
            .setColor(messages.colors.DEFAULT)
            .setTitle("🎨  New Event!")
            .setDescription(`**${messages.truncateString(event.prompt.description, 500)}**`)
            .addFields(
                { name: "End Time", value: time(Math.round(event.finishTime / 1000), "R"), inline: true },
            )
            .setFooter({ text: "Send me a DM with an attachment to submit for this event!" });

        if (event.prompt.authorId != undefined) {
            embed.addFields(
                { name: "Author", value: `<@${event.prompt.authorId}>`, inline: true },
            );
        }

        // Fetch the channel the message will be sent in, then send it there.
        try {
            const channel = await this.client.channels.fetch(event.channelId);

            const sendData = {
                embeds: [embed],
            };

            if ("PING_ROLE" in process.env) {
                sendData.content = `<@&${process.env.PING_ROLE}>`;
            }

            channel.send(sendData);
        }
        catch (error) {
            console.error(error);
            throw error;
        }
    }

    // Removes an event, displays a message, and shows submissions.
    async finish(event) {
        // Remove the event.
        this.removeEvent(event);
        this.save();

        // Create the finish message.
        const embed = new EmbedBuilder()
            .setColor(messages.colors.DEFAULT)
            .setTitle("🖼️  Event Finished!")
            .setDescription(`**${messages.truncateString(event.prompt.description, 500)}**`)
            .setFooter({ text: "Open the attached thread to view the submissions!" });

        // Fetch the event's channel, and send the message.
        const channel = await this.client.channels.fetch(event.channelId);
        const message = await channel.send({ embeds: [embed] });

        // Create the submission thread.
        const dateNow = new Date(Date.now());
        const curPromptDescription = event.prompt.description;

        const thread = await message.startThread({
            name: `${dateNow.toDateString()} | ${messages.truncateString(curPromptDescription, 80)}`,
            autoArchiveDuration: ThreadAutoArchiveDuration.OneDay,
            reason: `Event finished on ${dateNow.toDateString()}`,
        });

        // Iterate through each submission.
        const submissions = event.submissions;

        // Check if there has been anything submitted.
        if (Object.keys(submissions).length > 0) {
            const members = [];

            for (const id of Object.keys(submissions)) {
                const submission = submissions[id];

                // Fetch the member who created the submission.
                const member = await channel.guild.members.fetch(submission.authorId);
                // Save each member for later.
                members.push(member);

                const submissionEmbed = messages.createSubmissionEmbed(submission, member.user);

                // Add each submission to the thread as a message.
                await thread.send({ embeds: [submissionEmbed] });
            }

            // Add each member to the thread.
            for (const member of members) {
                await thread.members.add(member);
            }
        }
        else {
            // Create the message for no submissions.
            const submissionEmbed = new EmbedBuilder()
                .setTitle("❌  No Submissions...")
                .setDescription("It seems like this event didn't get any submissions.\n\n*To submit to an event, simply DM me your drawing relating to the prompt.*")
                // .setFooter( {text: `yeah i dont know what to put here without putting a insult or smth so FUCK YOU.` }) // fuck you BACK
                .setColor(messages.colors.ERROR);

            // Send the message in the thread.
            await thread.send({ embeds: [submissionEmbed] });
        }

        // If the event is to be repeated, create a new event with the old data + new prompt and start it.
        // TODO: Add the option to delay the start of the next event. Starting it instantly doesn't seem right to me.
        if (event.options.repeat == true) {
            // Create a new event with similar options & a new prompt.
            const prompt = event.getNextPrompt();
            const newEvent = new Event(event.guildId, event.channelId, prompt, event.options);

            // Start the new event.
            this.start(newEvent);
        }
    }

    async cancel(event, sendMessage = true) {
        this.removeEvent(event);
        this.save();

        if (sendMessage) {
            // Create the cancel message.
            const embed = new EmbedBuilder()
                .setColor(messages.colors.ERROR)
                .setTitle("❌  Event Cancelled.")
                .setDescription(`The event **${messages.truncateString(event.prompt.description, 500)}** has been cancelled.`);

            // Fetch the event's channel, and send the message.
            const channel = await this.client.channels.fetch(event.channelId);
            await channel.send({ embeds: [embed] });
        }
    }

    // Silently adds a new event to the handler.
    addEvent(event) {
        const guildId = event.guildId;

        // Check if the guild can have more events.
        let guildCount = 0;
        for (const testEvent of this.events) {
            if (testEvent.guildId == guildId) {
                guildCount += 1;
            }
        }

        if (guildCount >= this.client.config.maxGuildEvents) {
            return new Error("Max amount of events reached for this guild.", { code: "maxGuilds" });
        }

        // Add the event.
        this.events.push(event);
        return;
    }

    // Silently removes an event from the handler.
    removeEvent(event) {
        const index = this.events.indexOf(event);

        // GOD i hate js arrays they make me want death 100000% more than usual.
        if (index > -1) {
            this.events.splice(index, 1);
        }
    }

    // Save's each event to a file.
    // TODO: Maybe uh, dont use JSON for this. This can be improved.
    save(directory = eventDataPath) {
        // If the directory to be saved in does not exist, create it.
        if (!fs.existsSync(directory)) {
            fs.mkdirSync(directory, { recursive: true });
        }

        // Make each event data into a json string.
        const data = JSON.stringify(this.events, null, "\t");
        const filePath = path.join(directory, "events.json");

        // Save the file!
        fs.writeFileSync(filePath, data);
    }

    // Load all events in the specified directory.
    load(directory = eventDataPath) {
        const filePath = path.join(directory, "events.json");

        // Make sure the file exists, if not, there is nothing to load.
        if (!fs.existsSync(filePath)) return;

        const dataString = fs.readFileSync(filePath, { "encoding": "utf8", "flag": "r" });
        const jsonData = JSON.parse(dataString);

        // Create the events and load its data from the json.
        for (const i in jsonData) {
            const eventData = jsonData[i];

            const event = new Event();
            event.loadFromData(eventData);

            // Add the event.
            this.addEvent(event);
        }
    }
}

// Export the class.
module.exports = EventHandler;