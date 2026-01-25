import { query } from "../lib/setup.js";

const customPrompt = `You are a Python coding specialist.
Follow these guidelines:
- Write clean, well-documented code
- Use type hints for all functions
- Include comprehensive docstrings
- Prefer functional programming patterns when appropriate
- Always explain your code choices`;

const messages = [];

for await (const message of query({
    prompt: "Create a data processing pipeline",
    options: {
        systemPrompt: customPrompt,
    },
})) {
    messages.push(message);
    if (message.type === "assistant") {
        console.log("----- Assistant Message -----");
        console.log(message.message.content);
    }
}