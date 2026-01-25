import { query } from '../lib/setup.js';

// Store checkpoint metadata for better tracking
interface Checkpoint {
    id: string;
    description: string;
    timestamp: Date;
}

async function main() {
    const opts = {
        enableFileCheckpointing: true,
        permissionMode: "acceptEdits" as const,
        extraArgs: { 'replay-user-messages': null },
        env: { ...process.env, CLAUDE_CODE_ENABLE_SDK_FILE_CHECKPOINTING: '1' }
    };

    const response = query({
        prompt: "Refactor the utils.py file to improve code quality and organization.",
        options: opts
    });

    const checkpoints: Checkpoint[] = [];
    let sessionId: string | undefined;

    for await (const message of response) {
        if (message.type === 'user' && message.uuid) {
            checkpoints.push({
                id: message.uuid,
                description: `After turn ${checkpoints.length + 1}`,
                timestamp: new Date()
            });
        }
        if ('session_id' in message && !sessionId) {
            sessionId = message.session_id;
        }
    }

    // Later: rewind to any checkpoint by resuming the session
    if (checkpoints.length > 0 && sessionId) {
        const target = checkpoints[0];  // Pick any checkpoint
        const rewindQuery = query({
            prompt: "",  // Empty prompt to open the connection
            options: { ...opts, resume: sessionId }
        });

        for await (const msg of rewindQuery) {
            await rewindQuery.rewindFiles(target.id);
            break;
        }
        console.log(`Available checkpoints:`);
        checkpoints.forEach((cp, index) => {
            console.log(`  ${index + 1}. ${cp.description} (ID: ${cp.id}, Time: ${cp.timestamp.toISOString()})`);
        });
        console.log(`Rewound to: ${target.description}`);
    }
}

main();