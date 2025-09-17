import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { rateLimit } from "@/lib/redis";
import { databaseQueryTool } from "@/lib/ai/tools/query-prisma";
import { generateText } from "ai";
import { getGoogleModel } from "@/lib/ai/available-models";
import type { ChatMessage } from '@prisma/client';
import type { ModelMessage } from "ai";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const userSession = await auth();

  if (!userSession?.user?.email) {
    return new Response("Unauthorized", { status: 401 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anon";

  const { ok, remaining, reset } = await rateLimit(`api:chat-post:${ip}`, 10, 60_000);

  if (!ok) {
    return new Response("Too many requests", {
      status: 429,
      headers: {
        "RateLimit-Limit": "10",
        "RateLimit-Remaining": String(remaining),
        "RateLimit-Reset": String(Math.ceil((reset - Date.now()) / 1000)),
      },
    });
  }

  const user = await prisma.user.findUnique({
    where: { email: userSession.user.email },
  });

  if (!user) {
    return new Response("User not found", { status: 404 });
  }

  const { conversationId, message: userMessage } = await req.json();

  if (!userMessage || userMessage.trim() === "") {
    return new Response("Message is required", { status: 400 });
  }

  // --- Fetch prior messages from DB
  let previousMessages: { role: "user" | "assistant"; content: string }[] = [];

  if (conversationId) {
    const conversation = await prisma.chatConversation.findUnique({
      where: { id: conversationId },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });

    if (!conversation) return new Response("Conversation not found", { status: 404 });
    if (conversation.userId !== user.id) return new Response("Forbidden", { status: 403 });

    previousMessages = conversation.messages.map((msg: ChatMessage) => ({
      role: msg.role === "user" ? "user" : "assistant",
      content: msg.content,
    }));
  }

  const previousMessagesTyped: ModelMessage[] = previousMessages.map(msg => ({
    role: msg.role,
    content: msg.content,
  }));

  const promptMessages: ModelMessage[] = [
    {
      role: "system",
      content: `You are a helpful assistant that can search for deal information in a database...`,
    },
    ...previousMessagesTyped,
    { role: "user", content: userMessage },
  ];

  try {
    // Use generateText instead of generateObject for better tool handling
    const { text: aiResponse, toolCalls, toolResults } = await generateText({
    model: getGoogleModel("gemini-1.5-flash"),
    tools: { databaseQueryTool },
    messages: promptMessages,
  });

    // Save to DB (non-blocking)
    const now = new Date();
    const userMessageData = {
      role: "user",
      content: userMessage,
      createdAt: now,
    };
    const assistantMessageData = {
      role: "assistant",
      content: aiResponse,
      createdAt: new Date(now.getTime() + 1),
    };

    // Save messages asynchronously
    (async () => {
      try {
        if (!conversationId) {
          await prisma.chatConversation.create({
            data: {
              userId: user.id,
              title: "New Chat",
              messages: {
                create: [userMessageData, assistantMessageData],
              },
            },
          });
        } else {
          await prisma.chatConversation.update({
            where: { id: conversationId },
            data: {
              messages: {
                create: [userMessageData, assistantMessageData],
              },
            },
          });
        }
      } catch (err) {
        console.error("❌ Failed to save messages to DB:", err);
      }
    })();

    // Return the AI response
    return new Response(aiResponse, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });

  } catch (error) {
    console.error("❌ AI generation error:", error);
    return new Response("Internal server error", { status: 500 });
  }
}