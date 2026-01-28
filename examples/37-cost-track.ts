import { query } from "../lib/setup.js";

class CostTracker {
    private processedMessageIds = new Set<string>();
    private stepUsages: Array<any> = [];

    async trackConversation(prompt: string) {
        const result = await query({
            prompt,
            options: {
                // @ts-ignore
                onMessage: (message) => {
                    this.processMessage(message);
                }
            }
        });

        return {
            result,
            stepUsages: this.stepUsages,
            // @ts-ignore
            totalCost: result.usage?.total_cost_usd || 0
        };
    }

    private processMessage(message: any) {
        // Only process assistant messages with usage
        if (message.type !== 'assistant' || !message.usage) {
            return;
        }

        // Skip if we've already processed this message ID
        if (this.processedMessageIds.has(message.id)) {
            return;
        }

        // Mark as processed and record usage
        this.processedMessageIds.add(message.id);
        this.stepUsages.push({
            messageId: message.id,
            timestamp: new Date().toISOString(),
            usage: message.usage,
            costUSD: this.calculateCost(message.usage)
        });
    }

    private calculateCost(usage: any): number {
        // Implement your pricing calculation here
        // This is a simplified example
        const inputCost = usage.input_tokens * 0.00003;
        const outputCost = usage.output_tokens * 0.00015;
        const cacheReadCost = (usage.cache_read_input_tokens || 0) * 0.0000075;

        return inputCost + outputCost + cacheReadCost;
    }
}

// Usage
const tracker = new CostTracker();
const { result, stepUsages, totalCost } = await tracker.trackConversation(
    "Analyze and refactor this code"
);

console.log(`Steps processed: ${stepUsages.length}`);
console.log(`Total cost: $${totalCost.toFixed(4)}`);