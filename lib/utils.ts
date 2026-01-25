import RefParser from 'json-schema-ref-parser';

export function removeSchema(obj: any) {
    if (obj && typeof obj === 'object') {
        delete obj.$schema;
        for (const key of Object.keys(obj)) {
            removeSchema(obj[key]);
        }
    }
}

/**
 * Dereference a JSON Schema (resolving $ref) and remove meta properties
 * that can cause compatibility issues (like $schema).
 */
export async function dereferenceAndClean(rawSchema: any) {
    // @ts-ignore - the parser types may not be available in all environments
    const deref = await RefParser.dereference(rawSchema);
    removeSchema(deref);
    return deref;
}