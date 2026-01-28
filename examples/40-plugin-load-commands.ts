import { query } from "../lib/setup.js";
import * as path from "path";

async function runWithPlugin() {
    const pluginPath = path.join(process.cwd(), "plugins", "code-review");

    console.log("Loading plugin from:", pluginPath);

    for await (const message of query({
        prompt: "What custom commands do you have available?",
        options: {
            plugins: [
                { type: "local", path: pluginPath }
            ],
            maxTurns: 3, settingSources: ["project"]
        }
    })) {
        if (message.type === "system" && message.subtype === "init") {
            console.log("Loaded plugins:", message.plugins);
            console.log("Available commands:", message.slash_commands);
        }

        if (message.type === "assistant") {
            // @ts-ignore
            console.log("Assistant:", message.content);
        }
    }
}

runWithPlugin().catch(console.error);