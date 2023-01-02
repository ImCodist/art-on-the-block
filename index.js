// Requires
const fs = require("node:fs");
const path = require("node:path");

const { Client, GatewayIntentBits, Collection, REST, Routes } = require("discord.js");
const dotenv = require("dotenv");

// Load the .env file.
dotenv.config();

// Initialize the client.
const client = new Client({
	intents: [GatewayIntentBits.Guilds],
});

// Load events.
const eventsPath = path.join(__dirname, "events");
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith(".js"));

for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);

    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args));
    }
    else {
        client.on(event.name, (...args) => event.execute(...args));
    }
}

// Load slash commands.
client.commands = new Collection();

const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith(".js"));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);

    // Add the command to the collection.
    if ("data" in command && "execute" in command) {
        client.commands.set(command.data.name, command);
    }
    else {
        console.log(`Command at ${filePath} missing data and/or execute property. Skipping.`);
    }
}

// Register slash commands.
const commandsJSON = [];

for (const command of client.commands.values()) {
    commandsJSON.push(command.data.toJSON());
}

(async () => {
    const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

    try {
        console.log("Registering slash commands...");

        // Will register globally if missing test guild.
        let route = Routes.applicationCommands(process.env.CLIENT_ID);
        if ("TEST_GUILD_ID" in process.env) {
            route = Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.TEST_GUILD_ID);
        }

        const data = await rest.put(route, { body: commandsJSON });

        console.log(`Registered ${data.length} slash commands.`);
    }
    catch (error) {
        console.error(error);
    }
})();

// Login to the client.
client.login(process.env.TOKEN);