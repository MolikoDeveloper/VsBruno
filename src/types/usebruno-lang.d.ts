import { BruFile, BruEnvFile, BruCollection } from "src/types/bruno/bruno";

declare module '@usebruno/lang' {
    /** parses a .bru request into AST */
    export const bruToJsonV2 = (input: string): BruFile => { };
    /** serializes AST back to .bru */
    export const jsonToBruV2 = (json: BruFile): string => { };

    /** parses a .bru environment into AST */
    export const bruToEnvJsonV2 = (input: string): BruEnvFile => { };
    /** serializes AST back to .bru env */
    export const envJsonToBruV2 = (json: BruEnvFile): string => { };

    /** parses a .env / dotenv input into a JSON object */
    export const dotenvToJson = (input: string): Record<string, string> => { };

    /** parses a .bru collection file into AST */
    export const collectionBruToJson = (input: string): BruCollection => { };
    /** serializes AST back to .bru collection */
    export const jsonToCollectionBru = (json: BruCollection): string => { };
}
