import { z } from 'zod'
import $RefParser from 'json-schema-ref-parser'

// Define schema with Zod (same as example)
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

const raw = (z as any).toJSONSchema ? (z as any).toJSONSchema(FeaturePlan) : null
if (!raw) {
    console.error('z.toJSONSchema is not available in this zod version')
    process.exit(1)
}

async function main() {
    // Dereference any $ref
    const deref = await $RefParser.dereference(raw)

    // Remove $schema and additionalProperties recursively
    function clean(obj: any) {
        if (obj && typeof obj === 'object') {
            delete obj.$schema
            if (obj.additionalProperties !== undefined) delete obj.additionalProperties
            for (const k of Object.keys(obj)) {
                clean(obj[k])
            }
        }
    }
    clean(deref)

    console.log(JSON.stringify(deref, null, 2))
}

main().catch(err => { console.error(err); process.exit(1) })
