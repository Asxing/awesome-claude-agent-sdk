import { type AgentDefinition } from '@anthropic-ai/claude-agent-sdk';
import { query } from '../lib/setup.js';

// Factory function that returns an AgentDefinition
// This pattern lets you customize agents based on runtime conditions
function createSecurityAgent(securityLevel: 'basic' | 'strict'): AgentDefinition {
    const isStrict = securityLevel === 'strict';
    return {
        description: 'Security code reviewer',
        // Customize the prompt based on strictness level
        prompt: `You are a ${isStrict ? 'strict' : 'balanced'} security reviewer...`,
        tools: ['Read', 'Grep', 'Glob'],
        // Key insight: use a more capable model for high-stakes reviews
        model: isStrict ? 'opus' : 'sonnet'
    };
}

// The agent is created at query time, so each request can use different settings
for await (const message of query({
    prompt: "Review this utils.py for security issues",
    options: {
        allowedTools: ['Read', 'Grep', 'Glob', 'Task'],
        agents: {
            // Call the factory with your desired configuration
            'security-reviewer': createSecurityAgent('strict')
        }
    }
})) {
    if ('result' in message) console.log(message.result);
}