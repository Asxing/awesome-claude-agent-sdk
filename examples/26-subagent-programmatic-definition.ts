import { query } from "../lib/setup.js";

for await (const message of query({
    prompt: "Review the utils.py for security issues",
    options: {
        // Task tool is required for subagent invocation
        allowedTools: ['Read', 'Grep', 'Glob', 'Task'],
        agents: {
            'code-reviewer': {
                // description tells Claude when to use this subagent
                description: 'Expert code review specialist. Use for quality, security, and maintainability reviews.',
                // prompt defines the subagent's behavior and expertise
                prompt: `You are a code review specialist with expertise in security, performance, and best practices.

When reviewing code:
- Identify security vulnerabilities
- Check for performance issues
- Verify adherence to coding standards
- Suggest specific improvements

Be thorough but concise in your feedback.`,
                // tools restricts what the subagent can do (read-only here)
                tools: ['Read', 'Grep', 'Glob'],
                // model overrides the default model for this subagent
                model: 'sonnet'
            },
            'test-runner': {
                description: 'Runs and analyzes test suites. Use for test execution and coverage analysis.',
                prompt: `You are a test execution specialist. Run tests and provide clear analysis of results.

Focus on:
- Running test commands
- Analyzing test output
- Identifying failing tests
- Suggesting fixes for failures`,
                // Bash access lets this subagent run test commands
                tools: ['Bash', 'Read', 'Grep'],
            }
        }
    }
})) {
    if ('result' in message) console.log(message.result);
}