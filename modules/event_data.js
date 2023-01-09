/**
 * event_data.js
 * codist
 *
 * The event data holds all data classes like the Events, Prompts, and Submissions.
 * Basically when I need something involving data it would normally be kept here.
 */

// Requires
const fs = require("node:fs");

// Contains information about a prompt and who created it.
// Only really used for the Event class.
class Prompt {
    constructor(prompt, author = undefined) {
        this.description = prompt;
        this.authorId = author;
    }
}

// Contains all information needed after creating a submission toward an event.
// Stuff like the image(s) for the event are kept in here.
class Submission {
    constructor(message = undefined) {
        this.content = undefined;
        this.attachmentURLs = [];
        this.authorId = undefined;

        this.promptDescription = undefined;

        // A lot of a submissions data is inherited from a message, so it seems easier to get all info from one.
        if (message != undefined) {
            this.content = message.content;
            this.authorId = message.author.id;

            // Turns all attachments into url's to get rid of useless information.
            for (const value of message.attachments.values()) {
                this.attachmentURLs.push(value.url);
            }
        }
    }
}

// The soul of the project essentially.
// The Event class contains information regarding the event, like submissions and the guild.
// Aswell as having a bunch of useful functions when dealing with events.
class Event {
    constructor(guild, channel, prompt = undefined, options = {}) {
        this.guildId = guild;
        this.channelId = channel;
        this.prompt = prompt;

        this.options = options;

        this.submissions = {};
        this.finishTime = this.getFinishTime();

        // Will automatically create a prompt for itself if one is not defined.
        if (this.prompt == undefined) {
            this.prompt = this.getNextPrompt();
        }
    }

    // Gets the time the event should finish at.
    // Used for keeping a consistent schedule for repeating events.
    getFinishTime() {
        const hour = 18;
        const minute = 0;
        const second = 0;
        const millisecond = 0;

        const dateNow = new Date();
        const date = new Date();

        date.setHours(hour);
        date.setMinutes(minute);
        date.setSeconds(second);
        date.setMilliseconds(millisecond);

        while (date.getTime() <= dateNow.getTime()) {
            date.setDate(date.getDate() + 1);
        }

        return date.getTime();
    }

    // Adds a submission to the event.
    addSubmission(submission, user) {
        this.submissions[user] = submission;
    }

    // Chooses a prompt from the submissions, if none are found it'll just use a default one.
    // Usually called when a repeating event is being created and needs to get a prompt.
    getNextPrompt() {
        if (Object.keys(this.submissions).length > 0) {
            const users = [];

            // Get all users who submitted a prompt alongside their submission.
            for (const [user, submission] of Object.entries(this.submissions)) {
                if (submission.promptDescription != undefined) {
                    users.push(user);
                }
            }

            if (users.length > 0) {
                // If there are valid users pick from the list.
                const chosenUser = users[Math.floor(Math.random() * users.length)];
                const chosenSubmission = this.submissions[chosenUser];

                const prompt = new Prompt(chosenSubmission.promptDescription, chosenSubmission.authorId);

                return prompt;
            }
        }

        // Fallback
        return this.getRandomPrompt();
    }

    // Will get a default prompt from the list given.
    getRandomPrompt() {
        const data = fs.readFileSync("./assets/random_events.txt", { "encoding": "utf8", "flag": "r" });

        const descriptions = data.split("\n");
        const chosenDescription = descriptions[Math.floor(Math.random() * descriptions.length)];

        const prompt = new Prompt(chosenDescription);
        return prompt;
    }

    // Basically sets up an event from json data.
    // Used when loading from a file.
    loadFromData(data) {
        for (const i in data) {
            const eventData = data[i];
            this.guildId = eventData.guildId;
            this.channelId = eventData.channelId;
            this.options = eventData.options;
            this.finishTime = eventData.finishTime;

            const promptData = eventData.prompt;
            const prompt = new Prompt(promptData.description, promptData.authorId);
            this.prompt = prompt;

            const submissionsData = eventData.submissions;
            for (const [user, submissionData] of Object.entries(submissionsData)) {
                const submission = new Submission();
                submission.content = submissionData.content;
                submission.attachmentURLs = submissionData.attachmentURLs;
                submission.authorId = submissionData.authorId;
                submission.promptDescription = submissionData.promptDescription;

                this.submissions[user] = submission;
            }
        }
    }
}

// Exports
module.exports = {
    Prompt: Prompt,
    Submission: Submission,
    Event: Event,
};