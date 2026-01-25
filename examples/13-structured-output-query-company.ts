import { query } from '../lib/setup.js';

// Define the shape of data you want back
const schema = {
    type: 'object',
    properties: {
        company_name: { type: 'string' },
        founded_year: { type: 'number' },
        headquarters: { type: 'string' }
    },
    required: ['company_name']
}

for await (const message of query({
    prompt: 'Research Anthropic and provide key company information',
    options: {
        allowedTools: ['WebFetch'],
        outputFormat: {
            type: 'json_schema',
            schema: schema
        }
    }
})) {
    // The result message contains structured_output with validated data
    // @ts-ignore
    if (message.type === 'result' && message.structured_output) {
        // @ts-ignore
        console.log(message.structured_output)
        // { company_name: "Anthropic", founded_year: 2021, headquarters: "San Francisco, CA" }
    }
}