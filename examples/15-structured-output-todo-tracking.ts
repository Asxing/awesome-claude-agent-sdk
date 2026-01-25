import { query } from '../lib/setup.js'

// Define structure for TODO extraction
const todoSchema = {
    type: 'object',
    properties: {
        todos: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    text: { type: 'string' },
                    file: { type: 'string' },
                    line: { type: 'number' },
                    author: { type: 'string' },
                    date: { type: 'string' }
                },
                required: ['text', 'file', 'line']
            }
        },
        total_count: { type: 'number' }
    },
    required: ['todos', 'total_count']
}

// Agent uses Grep to find TODOs, Bash to get git blame info
for await (const message of query({
    prompt: 'Find all TODO comments in this codebase and identify who added them',
    options: {
        outputFormat: {
            type: 'json_schema',
            schema: todoSchema
        }
    }
})) {
    // @ts-ignore
    if (message.type === 'result' && message.structured_output) {
        // @ts-ignore
        const data = message.structured_output
        console.log(`Found ${data.total_count} TODOs`)
        // @ts-ignore
        data.todos.forEach(todo => {
            console.log(`${todo.file}:${todo.line} - ${todo.text}`)
            if (todo.author) {
                console.log(`  Added by ${todo.author} on ${todo.date}`)
            }
        })
    }
}