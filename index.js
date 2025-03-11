const { Client, GatewayIntentBits, ActivityType, EmbedBuilder, SlashCommandBuilder, REST, Routes } = require('discord.js');
const axios = require('axios');
require('dotenv').config();

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

const COINGECKO_API_URL = `https://api.coingecko.com/api/v3/simple/price?ids=${process.env.CRYPTOCURRENCY_ID}&vs_currencies=usd&include_24hr_change=true`;
const COINGECKO_API_DETAIL_URL = `https://api.coingecko.com/api/v3/coins/${process.env.CRYPTOCURRENCY_ID}`;

// Slash command name and description
const commands = [
    new SlashCommandBuilder().setName('price').setDescription('Get the current price of the cryptocurrency.'),
    new SlashCommandBuilder().setName('help').setDescription('Show the list of available commands.'),
    new SlashCommandBuilder().setName('ping').setDescription('Check bot latency.'),
    new SlashCommandBuilder().setName('fdv').setDescription('Get the Fully Diluted Valuation of the cryptocurrency.'),
    new SlashCommandBuilder().setName('volume').setDescription('Get the 24-hour trading volume of the cryptocurrency.')
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);
async function registerCommands() {
    try {
        console.log('Registering slash commands...');
        await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
        console.log('Slash commands registered successfully.');
    } catch (error) {
        console.error('Error registering slash commands:', error);
    }
}

async function updateBotInfo() {
    try {
        const response = await axios.get(COINGECKO_API_URL);
        const data = response.data[process.env.CRYPTOCURRENCY_ID];

        if (!data) throw new Error('No data received from CoinGecko API');

        const price = data.usd;
        const change24h = data.usd_24h_change !== undefined ? data.usd_24h_change.toFixed(2) : 'N/A';
        const percentChange = data.usd_24h_change > 0 ? `+${change24h}%` : `${change24h}%`;

        console.log('API Response:', JSON.stringify(data, null, 2));
        console.log(`Price: ${price}, 24h Change: ${change24h}`);

        // Update bot's status
        client.user.setPresence({
            activities: [{ name: `${process.env.CRYPTOCURRENCY_NAME} $${price} (${percentChange})`, type: ActivityType.Watching }],
            status: 'online'
        });

        // Update bot's bio
        await client.application.edit({
            description: `${process.env.CRYPTOCURRENCY_NAME}: $${price} (${percentChange})`
        });

        console.log(`Updated status and bio: Price - $${price}, 24h Change - ${percentChange}`);
    } catch (error) {
        console.error('Failed to update bot information:', error.message);
    }
}

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}`);
    await registerCommands();
    updateBotInfo();
    setInterval(updateBotInfo, 60000); // Update status and bio every 60 seconds
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;

    const { commandName } = interaction;

    if (commandName === 'price') {
        try {
            const response = await axios.get(COINGECKO_API_URL);
            const price = response.data[process.env.CRYPTOCURRENCY_ID].usd;
            const change24h = response.data[process.env.CRYPTOCURRENCY_ID].usd_24h_change !== undefined ? response.data[process.env.CRYPTOCURRENCY_ID].usd_24h_change.toFixed(2) : 'N/A';
            const percentChange = change24h > 0 ? `+${change24h}%` : `${change24h}%`;

            const embed = new EmbedBuilder()
                .setTitle(`${process.env.CRYPTOCURRENCY_NAME} Price`)
                .setDescription(`The current price of ${process.env.CRYPTOCURRENCY_NAME} is **$${price} USD**. (**${percentChange}**)`)
                .setColor(parseInt(process.env.EMBED_COLOR, 16));
            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            await interaction.reply('The bot is currently rate limited. Please try again in 1 minute.');
        }
    } else if (commandName === 'help') {
        const embed = new EmbedBuilder()
            .setTitle('Help Menu')
            .setDescription('`/price`, `/help`, `/ping`, `/fdv`, `/volume`')
            .setColor(parseInt(process.env.EMBED_COLOR, 16));
        await interaction.reply({ embeds: [embed] });
    } else if (commandName === 'ping') {
        const ping = Date.now() - interaction.createdTimestamp;
        const embed = new EmbedBuilder()
            .setTitle('Ping')
            .setDescription(`Pong! Latency is **${ping}ms** :ping_pong:.`)
            .setColor(parseInt(process.env.EMBED_COLOR, 16));
        await interaction.reply({ embeds: [embed] });
    } else if (commandName === 'fdv') {
        try {
            const response = await axios.get(COINGECKO_API_DETAIL_URL);
            const fdv = response.data.market_data.fully_diluted_valuation.usd.toLocaleString();
            const embed = new EmbedBuilder()
                .setTitle('Fully Diluted Valuation')
                .setDescription(`The Fully Diluted Valuation (FDV) of ${process.env.CRYPTOCURRENCY_NAME} is **$${fdv} USD**.`)
                .setColor(parseInt(process.env.EMBED_COLOR, 16));
            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            await interaction.reply('The bot is currently rate limited. Please try again in 1 minute.');
        }
    } else if (commandName === 'volume') {
        try {
            const response = await axios.get(COINGECKO_API_DETAIL_URL);
            const volume = response.data.market_data.total_volume.usd.toLocaleString();
            const embed = new EmbedBuilder()
                .setTitle('24-hour Trading Volume')
                .setDescription(`The 24-hour trading volume of ${process.env.CRYPTOCURRENCY_NAME} is **$${volume} USD**.`)
                .setColor(parseInt(process.env.EMBED_COLOR, 16));
            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            await interaction.reply('The bot is currently rate limited. Please try again in 1 minute.');
        }
    }
});

client.login(process.env.BOT_TOKEN);