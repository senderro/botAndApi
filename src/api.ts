// src/api.ts
import express, { Request, Response } from "express";
import { Client } from "discord.js";

export function setupApi(client: Client) {
  const app = express();
  
  app.use(express.json());

  app.post("/callback", async (req: Request, res: Response) => {
    const { threadId, message } = req.body;

    if (!threadId || !message) {
      return res.status(400).json({ error: "threadId and message required." });
    }

    try {
      const channel = await client.channels.fetch(threadId);

      if (!channel?.isTextBased() || !("send" in channel)) {
        return res.status(400).json({ error: "Invalid threadId or not a thread." });
      }

      await channel.send(message);
      return res.json({ success: true });
    } catch (err) {
      console.error("❌ Error sending message to thread:", err);
      return res.status(500).json({ error: "Failed to send message" });
    }
  });

  app.listen(4000, () => {
    console.log("📡 Callback API is running on http://localhost:4000");
  });
}
