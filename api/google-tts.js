// Vercel Serverless Function - Google Cloud TTS
// Converts text to speech using Google Cloud Text-to-Speech API

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

    const GOOGLE_API_KEY = process.env.GOOGLE_TTS_API_KEY || process.env.GEMINI_API_KEY;

    if (!GOOGLE_API_KEY) {
        return res.status(500).json({ error: 'Google TTS API key not configured' });
    }

    try {
        const { text, languageCode, voiceName, speakingRate, pitch } = req.body;

        if (!text) {
            return res.status(400).json({ error: 'Text is required' });
        }

        const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_API_KEY}`;

        const body = {
            input: { text: text },
            voice: {
                languageCode: languageCode || 'en-US',
                name: voiceName || 'en-US-Studio-Aoede'  // Default to Aoede
            },
            audioConfig: {
                audioEncoding: 'MP3',
                speakingRate: speakingRate || 1.0,
                pitch: pitch || 0
            }
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Google TTS Error:', errorText);
            return res.status(response.status).json({ error: 'TTS generation failed', details: errorText });
        }

        const data = await response.json();

        if (data.audioContent) {
            return res.status(200).json({
                audioContent: data.audioContent,
                contentType: 'audio/mp3'
            });
        }

        return res.status(500).json({ error: 'No audio content in response' });

    } catch (error) {
        console.error('Google TTS Error:', error);
        return res.status(500).json({ error: 'Failed to generate speech', details: error.message });
    }
}
