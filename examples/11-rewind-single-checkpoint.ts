
import { query } from '../lib/setup.js';

async function main() {
    // Step 1: Enable checkpointing
    const opts = {
        enableFileCheckpointing: true,
        permissionMode: "acceptEdits" as const,  // Auto-accept file edits without prompting
        extraArgs: { 'replay-user-messages': null },  // Required to receive checkpoint UUIDs in the response stream
        env: { ...process.env, CLAUDE_CODE_ENABLE_SDK_FILE_CHECKPOINTING: '1' }
    };

    const response = query({
        prompt: "Format the utils.py file according to PEP 8 standards, fixing any style issues.",
        options: opts
    });

    let checkpointId: string | undefined;
    let sessionId: string | undefined;

    // Step 2: Capture checkpoint UUID from the first user message
    for await (const message of response) {
        if (message.type === 'user' && message.uuid && !checkpointId) {
            checkpointId = message.uuid;
        }
        if ('session_id' in message && !sessionId) {
            sessionId = message.session_id;
        }
    }

    // Step 3: Later, rewind by resuming the session with an empty prompt
    if (checkpointId && sessionId) {
        const rewindQuery = query({
            prompt: "",  // Empty prompt to open the connection
            options: { ...opts, resume: sessionId }
        });

        for await (const msg of rewindQuery) {
            // Step 4: When prompted, rewind files to the checkpoint
            await rewindQuery.rewindFiles(checkpointId);
            break;
        }
        console.log(`Rewound to checkpoint: ${checkpointId}`);
    }
}

main();