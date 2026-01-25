import * as readline from "readline";
import { query } from "../lib/setup.js";

// Helper to prompt user for input in the terminal
function prompt(question: string): Promise<string> {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise((resolve) => rl.question(question, (answer) => { rl.close(); resolve(answer); }));
}

// Parse user input as option number(s) or free text
function parseResponse(response: string, options: any[]): string {
    const indices = response.split(",").map((s) => parseInt(s.trim()) - 1);
    const labels = indices
        .filter((i) => !isNaN(i) && i >= 0 && i < options.length)
        .map((i) => options[i].label);
    return labels.length > 0 ? labels.join(", ") : response;
}

// Display Claude's questions and collect user answers
async function handleAskUserQuestion(input: any) {
    const answers: Record<string, string> = {};

    for (const q of input.questions) {
        console.log(`\n${q.header}: ${q.question}`);

        const options = q.options;
        options.forEach((opt: any, i: number) => {
            console.log(`  ${i + 1}. ${opt.label} - ${opt.description}`);
        });
        if (q.multiSelect) {
            console.log("  (Enter numbers separated by commas, or type your own answer)");
        } else {
            console.log("  (Enter a number, or type your own answer)");
        }

        const response = (await prompt("Your choice: ")).trim();
        answers[q.question] = parseResponse(response, options);
    }

    // Return the answers to Claude (must include original questions)
    return {
        behavior: "allow" as const,
        updatedInput: { questions: input.questions, answers },
    };
}

async function main() {
    for await (const message of query({
        prompt: "Help me decide on the tech stack for a new mobile app",
        options: {
            // Accept the optional third context argument to satisfy SDK signature.
            canUseTool: async (toolName, input) => {
                // Route AskUserQuestion to our question handler
                if (toolName === "AskUserQuestion") {
                    return handleAskUserQuestion(input);
                }
                // Auto-approve other tools for this example
                return { behavior: "allow" as const, updatedInput: input };
            },
        },
    })) {
        if ("result" in message) console.log(message.result);
    }
}

main();