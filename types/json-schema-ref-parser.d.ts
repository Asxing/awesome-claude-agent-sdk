declare module 'json-schema-ref-parser' {
    export default class $RefParser {
        static dereference(schema: any): Promise<any>;
    }
}