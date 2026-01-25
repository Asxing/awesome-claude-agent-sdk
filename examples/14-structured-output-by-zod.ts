import { z } from 'zod'
import { query } from '../lib/setup.js'
import { dereferenceAndClean } from '../lib/utils.js'

// Define schema with Zod
const FeaturePlan = z.object({
    feature_name: z.string(),
    summary: z.string(),
    steps: z.array(
        z.object({
            step_number: z.number(),
            description: z.string(),
            estimated_complexity: z.enum(['low', 'medium', 'high'])
        })
    ),
    risks: z.array(z.string())
})
type FeaturePlan = z.infer<typeof FeaturePlan>

// Convert to JSON Schema and dereference/clean it
const schemaToUse = await dereferenceAndClean(z.toJSONSchema(FeaturePlan))

for await (const message of query({
    prompt: 'Provide a detailed specification for implementing user authentication in a web application. Include the feature name, summary, implementation steps with complexity levels, and potential risks. Format the response as structured data.',
    options: {
        allowedTools: [], // 不需要工具，直接生成结构化输出
        outputFormat: {
            type: 'json_schema',
            schema: schemaToUse
        }
    }
})) {
    // The result message contains structured_output with validated data
    // Use type assertion to bypass type error
    // @ts-ignore
    if (message.type === 'result' && (message as any).structured_output) {
        // @ts-ignore
        console.log((message as any).structured_output);
        // Should be validated FeaturePlan object
    }
}


