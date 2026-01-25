import { query } from "../lib/setup.js";


for await (const message of query({
    prompt: "What files are in this directory?",
    options: {
        allowedTools: ["Read", "Grep"],
    }
})) {
    if ("result" in message) {
        console.log(message.result);
    }
}
