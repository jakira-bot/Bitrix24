import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { rateLimit } from "@/lib/redis";
import { databaseQueryTool } from "@/lib/ai/tools/query-prisma";
import { streamText } from "ai";
import { getGoogleModel } from "@/lib/ai/available-models";
import type { ChatMessage } from '@prisma/client';
import type { ModelMessage } from "ai";
import { z } from "zod";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const userSession = await auth();

  if (!userSession?.user?.email) {
    return new Response("Unauthorized", { status: 401 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anon";

  const rateKey = userSession?.user?.email
    ? `chat:user:${userSession.user.email}`
    : `chat:ip:${ip}`;

  const { ok, remaining, reset } = await rateLimit(rateKey, 10, 60_000);

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

  const requestSchema = z.object({
    conversationId: z.string().optional(),
    message: z.string()
      .min(1, "Message cannot be empty")
      .max(2000, "Message too long (max 2000 characters)"),
  });

  let conversationId: string | undefined;
  let userMessage: string;

  try {
    const json = await req.json();
    const parsed = requestSchema.parse(json);
    conversationId = parsed.conversationId;
    userMessage = parsed.message;
  } catch (error) {
    console.error("❌ Invalid request body:", error);
    return new Response("Invalid input", { status: 400 });
  }

  // Fetch prior messages if any
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
      content: `You are a helpful assistant that can search for deal information in a database.`,
    },
    ...previousMessagesTyped,
    { role: "user", content: userMessage },
  ];

  try {
    // Call streamText
    const result = await streamText({
      model: getGoogleModel("gemini-1.5-flash"),
      tools: { databaseQueryTool },
      messages: promptMessages,
    });

    // ✅ This is the actual async iterable
    const streamAsyncIterable = result.textStream;

    if (!streamAsyncIterable || typeof streamAsyncIterable[Symbol.asyncIterator] !== 'function') {
      console.error("❌ result.textStream is not async iterable");
      return new Response("Internal Server Error", { status: 500 });
    }

    let assistantMessageContent = "";

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of streamAsyncIterable) {
            assistantMessageContent += chunk;
            const encoded = new TextEncoder().encode(chunk);
            controller.enqueue(encoded);
          }

          controller.close();

          // After streaming finishes, save messages to DB asynchronously
          const now = new Date();
          const userMessageData = {
            role: "user",
            content: userMessage,
            createdAt: now,
          };
          const assistantMessageData = {
            role: "assistant",
            content: assistantMessageContent,
            createdAt: new Date(now.getTime() + 1),
          };

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
        } catch (err) {
          console.error("Streaming failed:", err);
          controller.error(err);
        }
      }
    });

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    });


  } catch (error) {
    console.error("❌ AI generation error:", error);
    return new Response("Internal server error", { status: 500 });
  }
}
