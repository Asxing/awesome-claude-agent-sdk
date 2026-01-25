import { query } from "../lib/setup.js";
// First, capture the session ID
let sessionId: string | undefined

const response = query({
    prompt: "Help me design a REST API",
    options: { model: "claude-sonnet-4-5" }
})

for await (const message of response) {
    if (message.type === 'system' && message.subtype === 'init') {
        sessionId = message.session_id
        console.log(`Original session: ${sessionId}`)
    }
}

// Fork the session to try a different approach
const forkedResponse = query({
    prompt: "Now let's redesign this as a GraphQL API instead",
    options: {
        resume: sessionId,
        forkSession: true,  // Creates a new session ID
        model: "claude-sonnet-4-5"
    }
})

for await (const message of forkedResponse) {
    if (message.type === 'system' && message.subtype === 'init') {
        console.log(`Forked session: ${message.session_id}`)
        // This will be a different session ID
    }
}

// The original session remains unchanged and can still be resumed
const originalContinued = query({
    prompt: "Add authentication to the REST API",
    options: {
        resume: sessionId,
        forkSession: false,  // Continue original session (default)
        model: "claude-sonnet-4-5"
    }
})

for await (const message of originalContinued) {
    if (message.type === 'system' && message.subtype === 'init') {
        console.log(`Original session continued: ${message.session_id}`)
        // This will be the same session ID as the original
    }
}