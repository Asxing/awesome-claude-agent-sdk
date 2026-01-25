import { query, getConfig } from "../lib/setup.js";

const cfg = getConfig();

async function main() {
  for await (const message of query({
    prompt: "Help me refactor this code, filename: utils.py",
    options: {
      permissionMode: "default",  // Set the mode here
      pathToClaudeCodeExecutable: cfg.claudeExecutablePath
    },
  })) {
    if ("result" in message) {
      console.log(message.result);
    }
  }
}

main();