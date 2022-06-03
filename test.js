const Discord = require('discord.js');
const client = new Discord.Client({intents: new Discord.Intents(32767)});
const token = require("./config.json")

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
});

client.on('messageCreate', message => {
    if (message.content === 'ping') {
        const filter = (reaction, user) => reaction.emoji.name === "🤠";

        let collector = message.createReactionCollector(filter, { time: 5000 });
        collector.on('collect', (reaction, collector) => {
            console.log('got a reaction');
        });
        collector.on('end', collected => {
            console.log(`collected ${collected.size} reactions`);
        });

        message.react("🤠");
        message.react("☠");
        message.react("🤖");
            }
});

client.login(token.token);
