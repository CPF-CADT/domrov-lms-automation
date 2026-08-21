// ai-connection-test.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import OpenAI from 'openai';
import { GoogleGenAI } from '@google/genai';

export type AIProvider =
    | 'openai'
    | 'gemini'
    | 'ollama'
    | 'openrouter'
    | 'grok'
    | 'custom';

export const AI_PROVIDERS: AIProvider[] = [
    'openai',
    'gemini',
    'ollama',
    'openrouter',
    'grok',
    'custom',
];

interface TestConfig {
    provider: AIProvider;
    apiKey?: string;
    model: string;
    apiEndpoint?: string;
}

@Injectable()
export class AIConnectionTestService {
    /**
     * Test AI provider connectivity
     * Throws BadRequestException if invalid
     */
    async test(config: TestConfig): Promise<boolean> {
        try {
            const result = await this.ping(config);

            if (!result || result.trim() === '') {
                throw new BadRequestException('AI response is empty or invalid');
            }

            return true;
        } catch (err) {
            // Wrap any error as BadRequestException
            throw new BadRequestException(
                `AI connection test failed: ${
                    typeof err === 'object' && err !== null && 'message' in err
                        ? (err as any).message
                        : err
                }`,
            );
        }
    }

    // =========================
    // CORE PING
    // =========================
    private async ping(config: TestConfig): Promise<string> {
        const { provider } = config;

        switch (provider) {
            case 'openai':
                return this.testOpenAI(config);

            case 'gemini':
                return this.testGemini(config);

            case 'ollama':
                return this.testOllama(config);

            case 'openrouter':
            case 'grok':
            case 'custom':
                return this.testHTTP(config);

            default:
                throw new BadRequestException(
                    `Unsupported AI provider: ${provider}`,
                );
        }
    }

    // =========================
    // OPENAI (SDK)
    // =========================
    private async testOpenAI({ apiKey, model }: TestConfig): Promise<string> {
        if (!apiKey) throw new BadRequestException('OpenAI API key missing');

        const client = new OpenAI({ apiKey });

        const res = await client.chat.completions.create({
            model,
            messages: [{ role: 'user', content: 'ping' }],
            temperature: 0,
            max_tokens: 5,
        });

        return res.choices?.[0]?.message?.content ?? '';
    }

    // =========================
    // GEMINI (SDK)
    // =========================
    private async testGemini({ apiKey, model }: TestConfig): Promise<string> {
        if (!apiKey) throw new BadRequestException('Gemini API key missing');

        const genAI = new GoogleGenAI({ apiKey });

        const response = await genAI.models.generateContent({
            model,
            contents: 'ping',
        });

        return response.text || '';
    }

    // =========================
    // OLLAMA
    // =========================
    private async testOllama({ apiEndpoint, model }: TestConfig): Promise<string> {
        if (!apiEndpoint) throw new BadRequestException('Ollama endpoint missing');

        const res = await fetch(`${apiEndpoint}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model,
                messages: [{ role: 'user', content: 'ping' }],
                stream: false,
            }),
        });

        if (!res.ok) throw new BadRequestException(await res.text());

        const data = await res.json();
        return data.message?.content ?? '';
    }

    // =========================
    // GENERIC HTTP (OpenRouter, Grok, Custom)
    // =========================
    private async testHTTP({ apiKey, apiEndpoint, model }: TestConfig): Promise<string> {
        if (!apiEndpoint) throw new BadRequestException('API endpoint missing');

        const res = await fetch(apiEndpoint, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model,
                messages: [{ role: 'user', content: 'ping' }],
                temperature: 0,
                max_tokens: 5,
            }),
        });

        if (!res.ok) throw new BadRequestException(await res.text());

        const data = await res.json();

        return (
            data.choices?.[0]?.message?.content ||
            data.choices?.[0]?.text ||
            data.output?.[0]?.content?.[0]?.text ||
            ''
        );
    }
}