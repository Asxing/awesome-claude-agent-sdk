import { query } from "../lib/setup.js";

for await (const message of query({
    prompt: "Optimize utils.py performance and track progress with todos",
    options: { maxTurns: 15 }
})) {
    // Todo updates are reflected in the message stream
    if (message.type === "assistant") {
        for (const block of message.message.content) {
            if (block.type === "tool_use" && block.name === "TodoWrite") {
                // @ts-ignore
                const todos = block.input.todos;

                console.log("Todo Status Update:");
                // @ts-ignore
                todos.forEach((todo, index) => {
                    const status = todo.status === "completed" ? "✅" :
                        todo.status === "in_progress" ? "🔧" : "❌";
                    console.log(`${index + 1}. ${status} ${todo.content}`);
                });
            }
        }
    }
}