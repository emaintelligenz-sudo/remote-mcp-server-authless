import { McpServer } from "@modelcontextprotocol/server";
import { createMcpHandler } from "agents/mcp/server";
import { z } from "zod";

function createServer(env: Env) {
  const server = new McpServer({
    name: "OpenAI Bridge",
    version: "1.0.0",
  });

  server.registerTool(
    "ask_openai",
    {
      description: "Send a prompt to OpenAI and return the response",
      inputSchema: {
        prompt: z.string().describe("The prompt to send to OpenAI"),
      },
    },
    async ({ prompt }) => {
      try {
        const response = await fetch("https://api.openai.com/v1/responses", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: "gpt-5.6-luna",
            input: prompt,
          }),
        });

        const data: any = await response.json();

        if (!response.ok) {
          return {
            content: [
              {
                type: "text",
                text: `OpenAI API error: ${data?.error?.message ?? response.status}`,
              },
            ],
          };
        }

        const text = (data.output ?? [])
          .flatMap((item: any) => item.content ?? [])
          .filter((item: any) => item.type === "output_text")
          .map((item: any) => item.text)
          .join("\n");

        return {
          content: [
            {
              type: "text",
              text: text || "OpenAI returned no text.",
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error contacting OpenAI: ${String(error)}`,
            },
          ],
        };
      }
    },
  );

  return server;
}

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext) {
    return createMcpHandler(() => createServer(env))(request, env, ctx);
  },
} satisfies ExportedHandler<Env>;
