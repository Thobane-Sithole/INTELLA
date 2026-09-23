// Vercel Serverless Function - ElevenLabs TTS
// Converts text to Bengali speech securely

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

    if (!ELEVENLABS_API_KEY) {
        return res.status(500).json({ error: 'ElevenLabs API key not configured' });
    }

    try {
        const { text, voiceId, modelId } = req.body;

        if (!text) {
            return res.status(400).json({ error: 'Text is required' });
        }

        // Default voice ID for Bengali
        const voice = voiceId || 'nPczCjzI2devNBz1zQrb'; // Brian voice or your preferred
        const model = modelId || 'eleven_multilingual_v2';

        const url = `https://api.elevenlabs.io/v1/text-to-speech/${voice}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Accept': 'audio/mpeg',
                'Content-Type': 'application/json',
                'xi-api-key': ELEVENLABS_API_KEY
            },
            body: JSON.stringify({
                text,
                model_id: model,
                voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.75,
                    style: 0.5,
                    use_speaker_boost: true
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('ElevenLabs Error:', errorText);
            return res.status(response.status).json({ error: 'TTS generation failed', details: errorText });
        }

        // Get audio as buffer
        const audioBuffer = await response.arrayBuffer();

        // Return as base64 for easy handling in frontend
        const base64Audio = Buffer.from(audioBuffer).toString('base64');

        return res.status(200).json({
            audio: base64Audio,
            contentType: 'audio/mpeg'
        });

    } catch (error) {
        console.error('TTS Error:', error);
        return res.status(500).json({ error: 'Failed to generate speech', details: error.message });
    }
}
