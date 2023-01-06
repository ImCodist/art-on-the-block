const { Events } = require("discord.js");
const EventHandler = require("../modules/event_handler");

module.exports = {
    name: Events.ClientReady,
    once: true,

    execute(client) {
        console.log(`Logged in as ${client.user.tag}.`);

        // Setup the event handler.
        client.eventHandler = new EventHandler(client);
    },
};