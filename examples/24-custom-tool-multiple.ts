import { tool, createSdkMcpServer } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import { query } from "../lib/setup.js";


const calculatorServer = createSdkMcpServer({
    name: "calculator",
    version: "1.0.0",
    tools: [
        tool(
            "calculate",
            "Perform mathematical calculations",
            {
                expression: z.string().describe("Mathematical expression to evaluate"),
                precision: z.number().optional().default(2).describe("Decimal precision")
            },
            async (args) => {
                try {
                    // Use a safe math evaluation library in production
                    const result = eval(args.expression); // Example only!
                    const formatted = Number(result).toFixed(args.precision);

                    return {
                        content: [{
                            type: "text",
                            text: `${args.expression} = ${formatted}`
                        }]
                    };
                } catch (error) {
                    return {
                        content: [{
                            type: "text",
                            // @ts-ignore
                            text: `Error: Invalid expression - ${error.message}`
                        }]
                    };
                }
            }
        ),
        tool(
            "compound_interest",
            "Calculate compound interest for an investment",
            {
                principal: z.number().positive().describe("Initial investment amount"),
                rate: z.number().describe("Annual interest rate (as decimal, e.g., 0.05 for 5%)"),
                time: z.number().positive().describe("Investment period in years"),
                n: z.number().positive().default(12).describe("Compounding frequency per year")
            },
            async (args) => {
                const amount = args.principal * Math.pow(1 + args.rate / args.n, args.n * args.time);
                const interest = amount - args.principal;

                return {
                    content: [{
                        type: "text",
                        text: `Investment Analysis:\n` +
                            `Principal: $${args.principal.toFixed(2)}\n` +
                            `Rate: ${(args.rate * 100).toFixed(2)}%\n` +
                            `Time: ${args.time} years\n` +
                            `Compounding: ${args.n} times per year\n\n` +
                            `Final Amount: $${amount.toFixed(2)}\n` +
                            `Interest Earned: $${interest.toFixed(2)}\n` +
                            `Return: ${((interest / args.principal) * 100).toFixed(2)}%`
                    }]
                };
            }
        ),
        tool(
            "fetch_data",
            "Fetch data from an API",
            {
                endpoint: z.string().url().describe("API endpoint URL")
            },
            async (args) => {
                try {
                    const response = await fetch(args.endpoint);

                    if (!response.ok) {
                        return {
                            content: [{
                                type: "text",
                                text: `API error: ${response.status} ${response.statusText}`
                            }]
                        };
                    }

                    const data = await response.json();
                    return {
                        content: [{
                            type: "text",
                            text: JSON.stringify(data, null, 2)
                        }]
                    };
                } catch (error) {
                    return {
                        content: [{
                            type: "text",
                            // @ts-ignore
                            text: `Failed to fetch data: ${error.message}`
                        }]
                    };
                }
            }
        )
    ]
});




// Allow only specific tools with streaming input
async function* generateMessages() {
    yield {
        type: "user" as const,
        message: {
            role: "user" as const,
            content: "Calculate 5 + 3 and translate 'hello' to Spanish"
        }
    };
}

for await (const message of query({
    prompt: generateMessages(),  // Use async generator for streaming input
    options: {
        mcpServers: {
            calculator: calculatorServer
        },
        allowedTools: [
            "mcp__calculator__calculate",   // Allow calculator
            "mcp__calculator__compound_interest",   // Allow compound interest
            // "mcp__calculator__search_web" is NOT allowed
        ]
    }
})) {
    // Process messages
    if (message.type === "result" && message.subtype === "success") {
        console.log(message.result);
    }
}