// Vercel Serverless Function — Groq Text-to-Speech (PlayAI)
// Converts AI teacher responses to audio

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    if (!GROQ_API_KEY) return res.status(500).json({ error: 'GROQ_API_KEY not configured' });

    try {
        const { text, voice, speed } = req.body;
        if (!text) return res.status(400).json({ error: 'text is required' });

        // Groq PlayAI TTS — male/female voice options:
        // Male:   Fritz-PlayAI, Chip-PlayAI, Mason-PlayAI, Thunder-PlayAI
        // Female: Aaliyah-PlayAI, Jade-PlayAI, Celeste-PlayAI, Quinn-PlayAI
        const selectedVoice = voice || 'Fritz-PlayAI';

        const response = await fetch('https://api.groq.com/openai/v1/audio/speech', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'playai-tts',
                input: text,
                voice: selectedVoice,
                response_format: 'wav',
                speed: speed || 1.0,
            }),
        });

        if (!response.ok) {
            const err = await response.text();
            return res.status(response.status).json({ error: err });
        }

        res.setHeader('Content-Type', 'audio/wav');
        res.setHeader('Cache-Control', 'no-cache');
        const buffer = await response.arrayBuffer();
        return res.end(Buffer.from(buffer));
    } catch (err) {
        console.error('Groq TTS error:', err);
        return res.status(500).json({ error: err.message });
    }
};
