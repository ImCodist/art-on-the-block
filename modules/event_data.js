const fs = require("node:fs");

class Prompt {
    constructor(prompt, author = undefined) {
        this.description = prompt;
        this.authorId = author;
    }
}

class Submission {
    constructor(message = undefined) {
        this.content = undefined;
        this.attachmentURLs = [];
        this.authorId = undefined;

        this.promptDescription = undefined;

        if (message != undefined) {
            this.content = message.content;
            this.authorId = message.author.id;

            for (const value of message.attachments.values()) {
                this.attachmentURLs.push(value.url);
            }
        }
    }
}

class Event {
    constructor(guild, channel, prompt = undefined, options = {}) {
        this.guildId = guild;
        this.channelId = channel;
        this.prompt = prompt;

        this.options = options;

        this.submissions = {};
        this.finishTime = this.getFinishTime();

        if (this.prompt == undefined) {
            this.prompt = this.getNextPrompt();
        }
    }

    getFinishTime() {
        const date = new Date();

        let next = 0;
        if (date.getHours() >= 12) {
            next = 1;
        }

        date.setDate(date.getDate() + next);

        date.setHours(12);
        date.setMinutes(0);
        date.setSeconds(0);
        date.setMilliseconds(0);

        return date.getTime();
    }

    addSubmission(submission, user) {
        this.submissions[user] = submission;
    }

    getNextPrompt() {
        if (Object.keys(this.submissions).length > 0) {
            const users = [];

            for (const [user, submission] of Object.entries(this.submissions)) {
                if (submission.promptDescription != undefined) {
                    users.push(user);
                }
            }

            if (users.length > 0) {
                const chosenUser = users[Math.floor(Math.random() * users.length)];
                const chosenSubmission = this.submissions[chosenUser];

                const prompt = new Prompt(chosenSubmission.promptDescription, chosenSubmission.authorId);

                return prompt;
            }
        }

        return this.getRandomPrompt();
    }

    getRandomPrompt() {
        const data = fs.readFileSync("./assets/random_events.txt", { "encoding": "utf8", "flag": "r" });

        const descriptions = data.split("\n");
        const chosenDescription = descriptions[Math.floor(Math.random() * descriptions.length)];

        const prompt = new Prompt(chosenDescription);
        return prompt;
    }

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

module.exports = {
    Prompt: Prompt,
    Submission: Submission,
    Event: Event,
};