/**
 * LLM Chat Application Template
 *
 * A simple chat application using Cloudflare Workers AI.
 * This template demonstrates how to implement an LLM-powered chat interface with
 * streaming responses using Server-Sent Events (SSE).
 *
 * @license MIT
 */
import { Env, ChatMessage } from "./types";

// Model ID for Workers AI model
// https://developers.cloudflare.com/workers-ai/models/
const MODEL_ID = "@cf/openai/gpt-oss-120b";

// Default system prompt
const SYSTEM_PROMPT =
  "你就是ChatGPT，一个由OpenAI训练的大型语言模型。在对话过程中，适应用户的语气和偏好。尝试匹配用户的氛围、语气以及他们说话的总体方式。您希望对话感觉自然。您通过回复所提供的信息、提出相关问题并表现出真正的好奇心来进行真实的对话。如果自然，请使用您了解的有关用户的信息来个性化您的回复并提出后续问题。不要在多阶段用户请求的每个步骤之间要求确认。但是，对于模棱两可的请求，您可以要求澄清（但要谨慎）。对于任何谜语、技巧问题、偏见测试、假设测试、刻板印象检查，您必须密切关注查询的确切措辞，并非常仔细地考虑以确保您得到正确的答案。您必须假设措辞与您以前可能听到的变体略有或对抗性不同。如果您认为某件事是“经典谜语”，您绝对必须事后猜测并仔细检查问题的各个方面。同样，对简单的算术问题要非常小心;不要依赖背诵的答案！研究表明，当你在回答之前没有一步一步地找出答案时，你几乎总是会犯算术错误。从字面上看，你做过的任何算术，无论多么简单，都应该逐位计算，以确保你给出正确的答案。";

export default {
  /**
   * Main request handler for the Worker
   */
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    const url = new URL(request.url);

    // Handle static assets (frontend)
    if (url.pathname === "/" || !url.pathname.startsWith("/api/")) {
      return env.ASSETS.fetch(request);
    }

    // API Routes
    if (url.pathname === "/api/chat") {
      // Handle POST requests for chat
      if (request.method === "POST") {
        return handleChatRequest(request, env);
      }

      // Method not allowed for other request types
      return new Response("Method not allowed", { status: 405 });
    }

    // Handle 404 for unmatched routes
    return new Response("Not found", { status: 404 });
  },
} satisfies ExportedHandler<Env>;

/**
 * Handles chat API requests
 */
async function handleChatRequest(
  request: Request,
  env: Env,
): Promise<Response> {
  try {
    // Parse JSON request body
    const { messages = [] } = (await request.json()) as {
      messages: ChatMessage[];
    };

    // Add system prompt if not present
    if (!messages.some((msg) => msg.role === "system")) {
      messages.unshift({ role: "system", content: SYSTEM_PROMPT });
    }

    const response = await env.AI.run(
      MODEL_ID,
      {
        messages,
        max_tokens: 1024,
      },
      {
        returnRawResponse: true,
        // Uncomment to use AI Gateway
        // gateway: {
        //   id: "YOUR_GATEWAY_ID", // Replace with your AI Gateway ID
        //   skipCache: false,      // Set to true to bypass cache
        //   cacheTtl: 3600,        // Cache time-to-live in seconds
        // },
      },
    );

    // Return streaming response
    return response;
  } catch (error) {
    console.error("Error processing chat request:", error);
    return new Response(
      JSON.stringify({ error: "Failed to process request" }),
      {
        status: 500,
        headers: { "content-type": "application/json" },
      },
    );
  }
}
