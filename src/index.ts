import { Client, GatewayIntentBits } from "discord.js";
import * as dotenv from "dotenv";
import jwt from "jsonwebtoken";
import { setupApi } from "./api";

dotenv.config();

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
  console.log(`🤖 Bot conectado como ${client.user?.tag}`);
});




client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  
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

  // 📌 /send @user 50 ETH
  if (message.content.startsWith("/send ")) {
    const parts = message.content.trim().split(" ");
    if (parts.length < 4 || message.mentions.users.size === 0) {
      return message.reply("❌ Use o formato: `/send @usuário quantidade tipoDeToken`");
    }
  
    const toUser = message.mentions.users.first();
    const amount = parts[2];
    const tokenType = parts[3];
  
    if (!toUser) {
      return message.reply("❌ Não foi possível identificar o usuário destinatário.");
    }
  
    const channelId = message.channel.id; // Obtém o ID do canal onde o comando foi executado
  
    const thread = await message.startThread({
      name: `Envio para ${toUser.username}`,
      autoArchiveDuration: 60,
    });
  
    const threadId = thread.id; // Obtém o ID da thread recém-criada
  
    const payload = {
      creatorUser: `${message.author.username}#${message.author.discriminator}`,
      toDiscordId: `${toUser.username}#${toUser.discriminator}`,
      amount,
      coinType: tokenType,
      threadId,
      channelId,
      exp: Math.floor(Date.now() / 1000) + 5 * 60, // Expira em 5 minutos
    };
  
    const token = jwt.sign(payload, JWT_SECRET);
    const link = `${SITE_URL}/enviar/${token}`;
  
    await thread.send(
      `💸 ${message.author} deseja enviar **${amount} ${tokenType}** para ${toUser}!\n` +
      `🔗 Complete a transação aqui: ${link}`
    );
  }
  

  // Antigo comando de teste
  if (message.content === "!ping") {
    message.reply("🏓 Pong!");
  }
});

client.login(process.env.DISCORD_TOKEN);



setupApi(client);
