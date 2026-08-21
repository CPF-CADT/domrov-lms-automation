export interface GrokRate {
    inputRate: number;   // cost per input token
    outputRate: number;  // cost per output token
}

export interface TokenUsage {
    inputTokens: number;
    outputTokens: number;
}

/**
 * Calculate total cost for a Grok model based on token usage
 * @param usage Number of input and output tokens
 * @param rate Rate per token for the model
 * @returns Total cost in your currency unit
 */
export function calculateCost(usage: TokenUsage, rate: GrokRate): number {
    const { inputTokens, outputTokens } = usage;
    const { inputRate, outputRate } = rate;

    if (inputTokens < 0 || outputTokens < 0) {
        throw new Error('Token counts must be non-negative');
    }

    const totalCost = inputTokens * inputRate + outputTokens * outputRate;
    return totalCost;
}