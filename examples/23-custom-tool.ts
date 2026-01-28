import { tool, createSdkMcpServer } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import { query } from "../lib/setup.js";

// Create an SDK MCP server with custom tools
const customServer = createSdkMcpServer({
    name: "my-custom-tools",
    version: "1.0.0",
    tools: [
        tool(
            "get_weather",
            "Get current temperature for a location using coordinates",
            {
                latitude: z.number().describe("Latitude coordinate"),
                longitude: z.number().describe("Longitude coordinate")
            },
            async (args) => {
                const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${args.latitude}&longitude=${args.longitude}&current=temperature_2m&temperature_unit=fahrenheit`);
                const data = await response.json();

                return {
                    content: [{
                        type: "text",
                        // @ts-ignore
                        text: `Temperature: ${data.current.temperature_2m}°F`
                    }]
                };
            }
        )
    ]
});

// Use the custom tools in your query with streaming input
async function* generateMessages() {
    yield {
        type: "user" as const,
        message: {
            role: "user" as const,
            content: "What's the weather in San Francisco?"
        }
    };
}

for await (const message of query({
    prompt: generateMessages(),  // Use async generator for streaming input
    options: {
        mcpServers: {
            "my-custom-tools": customServer  // Pass as object/dictionary, not array
        },
        // Optionally specify which tools Claude can use
        allowedTools: [
            "mcp__my-custom-tools__get_weather",  // Allow the weather tool
            // Add other tools as needed
        ],
        maxTurns: 3
    }
})) {
    if (message.type === "result" && message.subtype === "success") {
        console.log(message.result);
    }
}