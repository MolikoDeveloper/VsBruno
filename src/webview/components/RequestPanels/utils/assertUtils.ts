export const AssertionOperators = [
    {
        label: 'Equal',
        value: 'eq',
    },
    {
        label: 'Not Equal',
        value: 'neq',
    },
    {
        label: 'Less Than',
        value: 'lt',
    },
    {
        label: 'Greater Than',
        value: 'gt',
    },
    {
        label: 'Contains',
        value: 'contains',
    },
    {
        label: 'Matches (RegExp)',
        value: 'matches',
    },
] as const;

export type AssertionOperator = typeof AssertionOperators[number]['value'];

/** Parsed form of an assertion value */
export interface AssertionValue {
    operator: AssertionOperator;
    operand: string;
}

/**
 * ParseAssertToValue
 * @param raw the raw assertion value string (e.g. "contains bsa")
 * @returns the operator and operand parts
 */
export function ParseAssertToValue(raw: string): AssertionValue {
    const [first, ...rest] = raw.trim().split(/\s+/);
    const operator = (first as AssertionOperator);
    const operand = rest.join(' ');
    return { operator, operand };
}

/**
 * ParseValueToAssert
 * @param value parsed assertion parts
 * @returns the reconstructed raw value string
 */
export function ParseValueToAssert(value: AssertionValue): string {
    return `${value.operator} ${value.operand}`.trim();
}
