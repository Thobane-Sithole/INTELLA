// Vercel Serverless Function — Groq Speech-to-Text (Whisper)
// Transcribes student voice input

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    if (!GROQ_API_KEY) return res.status(500).json({ error: 'GROQ_API_KEY not configured' });

    try {
        // Expect multipart/form-data with an "audio" file field
        // The client should send: FormData with audio blob + optional language hint
        const contentType = req.headers['content-type'] || '';
        if (!contentType.includes('multipart/form-data')) {
            return res.status(400).json({ error: 'Expected multipart/form-data with audio field' });
        }

        // Forward the raw body directly to Groq (pass-through proxy)
        const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': contentType,
            },
            body: req,
            // Duplex needed for Node 18+ streaming body
            duplex: 'half',
        });

        const data = await response.json();
        return res.status(response.status).json(data);
    } catch (err) {
        console.error('Groq STT error:', err);
        return res.status(500).json({ error: err.message });
    }
};
