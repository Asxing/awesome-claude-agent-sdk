import { query } from "../lib/setup.js";

class TodoTracker {
    private todos: any[] = [];

    displayProgress() {
        if (this.todos.length === 0) return;

        const completed = this.todos.filter(t => t.status === "completed").length;
        const inProgress = this.todos.filter(t => t.status === "in_progress").length;
        const total = this.todos.length;

        console.log(`\nProgress: ${completed}/${total} completed`);
        console.log(`Currently working on: ${inProgress} task(s)\n`);

        this.todos.forEach((todo, index) => {
            const icon = todo.status === "completed" ? "✅" :
                todo.status === "in_progress" ? "🔧" : "❌";
            const text = todo.status === "in_progress" ? todo.activeForm : todo.content;
            console.log(`${index + 1}. ${icon} ${text}`);
        });
    }

    async trackQuery(prompt: string) {
        for await (const message of query({
            prompt,
            options: { maxTurns: 20 }
        })) {
            if (message.type === "assistant") {
                for (const block of message.message.content) {
                    if (block.type === "tool_use" && block.name === "TodoWrite") {
                        // @ts-ignore
                        this.todos = block.input.todos;
                        this.displayProgress();
                    }
                }
            }
        }
    }
}

// Usage
const tracker = new TodoTracker();
await tracker.trackQuery("Build a complete authentication system with todos");