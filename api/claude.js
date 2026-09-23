// Vercel Serverless Function — Claude AI (Anthropic)
// Replaces Gemini as INTELLA's AI brain

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
    if (!ANTHROPIC_API_KEY) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });

    try {
        const { model, messages, system, max_tokens, temperature, stream } = req.body;

        const body = {
            model: model || 'claude-sonnet-4-6',
            max_tokens: max_tokens || 1024,
            messages,
        };
        if (system) body.system = system;
        if (temperature !== undefined) body.temperature = temperature;
        if (stream) body.stream = true;

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'x-api-key': ANTHROPIC_API_KEY,
                'anthropic-version': '2023-06-01',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        if (stream) {
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                res.write(decoder.decode(value));
            }
            return res.end();
        }

        const data = await response.json();
        return res.status(response.status).json(data);
    } catch (err) {
        console.error('Claude API error:', err);
        return res.status(500).json({ error: err.message });
    }
};
