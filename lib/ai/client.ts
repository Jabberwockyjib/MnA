import Anthropic from '@anthropic-ai/sdk'

// Initialize Anthropic client
// Make sure to set ANTHROPIC_API_KEY in your environment
export const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY || '',
})

// Model configuration
export const AI_CONFIG = {
    model: 'claude-3-5-sonnet-20241022',
    maxTokens: 4096,
    temperature: 0.7,
} as const

/**
 * Generate text completion using Claude
 */
export async function generateCompletion(
    prompt: string,
    options?: {
        systemPrompt?: string
        maxTokens?: number
        temperature?: number
    }
): Promise<string> {
    try {
        const message = await anthropic.messages.create({
            model: AI_CONFIG.model,
            max_tokens: options?.maxTokens || AI_CONFIG.maxTokens,
            temperature: options?.temperature ?? AI_CONFIG.temperature,
            system: options?.systemPrompt,
            messages: [
                {
                    role: 'user',
                    content: prompt,
                },
            ],
        })

        const firstBlock = message.content[0]
        if (firstBlock.type === 'text') {
            return firstBlock.text
        }

        throw new Error('Unexpected response format from Claude')
    } catch (error) {
        console.error('AI completion error:', error)
        throw new Error('Failed to generate AI completion')
    }
}

/**
 * Generate structured JSON response using Claude
 */
export async function generateStructuredResponse<T>(
    prompt: string,
    options?: {
        systemPrompt?: string
        maxTokens?: number
    }
): Promise<T> {
    try {
        const response = await generateCompletion(prompt, {
            ...options,
            systemPrompt: options?.systemPrompt
                ? `${options.systemPrompt}\n\nYou must respond with valid JSON only. Do not include any text before or after the JSON.`
                : 'You must respond with valid JSON only. Do not include any text before or after the JSON.',
            temperature: 0.3, // Lower temperature for more consistent JSON
        })

        // Try to extract JSON from the response
        const jsonMatch = response.match(/\{[\s\S]*\}|\[[\s\S]*\]/)
        if (!jsonMatch) {
            throw new Error('No valid JSON found in response')
        }

        return JSON.parse(jsonMatch[0]) as T
    } catch (error) {
        console.error('Structured response error:', error)
        throw new Error('Failed to generate structured AI response')
    }
}
