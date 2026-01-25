import { z } from 'zod'

// Define schema with Zod (same as in examples/14)
const FeaturePlan = z.object({
    feature_name: z.string(),
    summary: z.string(),
    steps: z.array(z.object({
        step_number: z.number(),
        description: z.string(),
        estimated_complexity: z.enum(['low', 'medium', 'high'])
    })),
    risks: z.array(z.string())
})

// Convert to JSON Schema and print
const schema = (z as any).toJSONSchema ? (z as any).toJSONSchema(FeaturePlan) : null
if (!schema) {
    console.error('z.toJSONSchema is not available in this zod version')
    process.exit(1)
}
console.log(JSON.stringify(schema, null, 2))
