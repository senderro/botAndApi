import { Client, GatewayIntentBits } from "discord.js";
import * as dotenv from "dotenv";
import jwt from "jsonwebtoken";
import { setupApi } from "./api";
import fetch from "node-fetch";

dotenv.config();


interface DonationCreateResponse {
  id?: string;
  error?: string;
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const JWT_SECRET = process.env.JWT_SECRET || "changeme";
const SITE_URL = process.env.SITE_URL || "http://localhost:3000";

client.once("ready", () => {
  console.log(`🤖 Bot connected as ${client.user?.tag}`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  // /register
  if (message.content.startsWith("/register ")) {
    const parts = message.content.trim().split(" ");
    const address = parts[1];

    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return message.reply("❌ Invalid address. Please use a valid Ethereum address.");
    }

    const thread = await message.startThread({
      name: `Register ${message.author.username}`,
      autoArchiveDuration: 60,
    });

    const payload = {
      discordId: `${message.author.username}#${message.author.discriminator}`,
      walletAddress: address,
      threadId: thread.id,
      channelId: message.channel.id,
      exp: Math.floor(Date.now() / 1000) + 5 * 60,
    };

    const token = jwt.sign(payload, JWT_SECRET);
    const link = `${SITE_URL}/registrar/${token}`;

    await thread.send(`✅ To complete your wallet registration, visit:\n${link}`);
  }

  // /send
  if (message.content.startsWith("/send ")) {
    const parts = message.content.trim().split(" ");
    if (parts.length < 4 || message.mentions.users.size === 0) {
      return message.reply("❌ Use the format: `/send @user amount tokenType`");
    }

    const toUser = message.mentions.users.first();
    const amount = parts[2];
    const tokenType = parts[3];

    if (!toUser) {
      return message.reply("❌ Could not identify the recipient user.");
    }

    const channelId = message.channel.id;
    const thread = await message.startThread({
      name: `Send to ${toUser.username}`,
      autoArchiveDuration: 60,
    });
    const threadId = thread.id;

    const payload = {
      creatorUser: `${message.author.username}#${message.author.discriminator}`,
      toDiscordId: `${toUser.username}#${toUser.discriminator}`,
      amount,
      coinType: tokenType,
      threadId,
      channelId,
      exp: Math.floor(Date.now() / 1000) + 5 * 60,
    };

    const token = jwt.sign(payload, JWT_SECRET);
    const link = `${SITE_URL}/enviar/${token}`;

    await thread.send(
      `💸 ${message.author} wants to send **${amount} ${tokenType}** to ${toUser}!\n` +
      `🔗 Complete the transaction here: ${link}`
    );
  }

  // /donation amount token timeInDays
  if (message.content.startsWith("/donation ")) {
    const parts = message.content.trim().split(" ");
    if (parts.length < 4) {
      return message.reply("❌ Use the format: `/donation amount token days`.");
    }

    const amount = parts[1];
    const token = parts[2];
    const timeInDays = parseInt(parts[3]);

    if (isNaN(timeInDays) || timeInDays <= 0) {
      return message.reply("❌ Invalid number of days. Use a positive number.");
    }

    const expiresAt = new Date(Date.now() + timeInDays * 24 * 60 * 60 * 1000).toISOString();

    const thread = await message.startThread({
      name: `Donation by ${message.author.username}`,
      autoArchiveDuration: timeInDays * 1440 <= 10080 ? (timeInDays * 1440) : 10080, // max 7 days
    });

    const body = {
      discordId: `${message.author.username}#${message.author.discriminator}`,
      amount,
      token,
      expiresAt,
      discordThreadId: thread.id,
      discordChannelId: message.channel.id,
    };

    try {
      const res = await fetch(`${SITE_URL}/api/doacao/criar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json() as DonationCreateResponse;

      if (!res.ok) {
        await thread.send(`❌ Failed to create donation: ${data.error || "Unknown error."}`);
      } else {
        const link = `${SITE_URL}/doacao/${data.id}`;
        await thread.send(`🎯 Donation created successfully! Share this link:
${link}`);
      }
    } catch (err) {
      console.error("Error creating donation:", err);
      await thread.send("❌ Internal error while trying to create donation.");
    }
  }

  if (message.content === "!ping") {
    message.reply("🏓 Pong!");
  }
});

client.login(process.env.DISCORD_TOKEN);
setupApi(client);