// Vercel Serverless Function - Edge TTS (Microsoft Edge FREE TTS)
// 322 HD Neural Voices across 100+ countries - FREE alternative to ElevenLabs

const { EdgeTTS } = require('edge-tts-universal');

module.exports = async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { text, voice, emotion } = req.body;

        if (!text) {
            return res.status(400).json({ error: 'Text is required' });
        }

        // Use the provided voice directly, or default to best English HD voice
        const selectedVoice = voice || 'en-US-AvaMultilingualNeural';

        // Emotion styles (only work with English voices)
        const emotionMap = {
            'happy': 'cheerful',
            'excited': 'excited',
            'sad': 'sad',
            'angry': 'angry',
            'friendly': 'friendly',
            'hopeful': 'hopeful',
            'shouting': 'shouting',
            'terrified': 'terrified',
            'unfriendly': 'unfriendly',
            'whispering': 'whispering',
            'neutral': 'neutral'
        };

        const selectedEmotion = emotionMap[emotion] || null;

        console.log(`Edge TTS: "${text.substring(0, 50)}..." | Voice: ${selectedVoice} | Emotion: ${selectedEmotion || 'none'}`);

        let audioBuffer;
        const wordTimings = [];

        // Check if emotion is requested and voice supports it
        const isEnglishVoice = selectedVoice.includes('en-US');

        if (selectedEmotion && isEnglishVoice && selectedEmotion !== 'neutral') {
            // Use Communicate class for emotion support
            const { Communicate } = require('edge-tts-universal');

            // Full voice name required for Communicate
            const fullVoiceName = `Microsoft Server Speech Text to Speech Voice (${selectedVoice})`;
            const communicate = new Communicate(text, fullVoiceName, selectedEmotion);

            // Collect audio chunks and word boundaries
            const audioChunks = [];

            for await (const chunk of communicate.stream()) {
                if (chunk.type === 'audio' && chunk.data) {
                    audioChunks.push(chunk.data);
                }
                // Collect word timing for lip-sync
                if (chunk.type === 'WordBoundary' && chunk.data) {
                    wordTimings.push({
                        word: chunk.data.text,
                        startTime: chunk.data.offset / 10000, // Convert to milliseconds
                        duration: chunk.data.duration / 10000
                    });
                }
            }

            if (audioChunks.length === 0) {
                throw new Error('No audio generated. Tip: Emotions work best with English text and en-US voices.');
            }

            // Combine audio chunks
            audioBuffer = Buffer.concat(audioChunks);

        } else {
            // Use simple EdgeTTS for non-emotion speech
            const tts = new EdgeTTS(text, selectedVoice);
            const result = await tts.synthesize();

            // Convert to buffer
            audioBuffer = Buffer.from(await result.audio.arrayBuffer());
        }

        // Return audio with optional timing data
        if (req.body.includeTimings) {
            // Always return JSON when includeTimings is requested
            return res.status(200).json({
                audio: audioBuffer.toString('base64'),
                timings: wordTimings, // May be empty for non-English
                voice: selectedVoice,
                emotion: selectedEmotion
            });
        }

        // Return audio file directly
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Content-Length', audioBuffer.length);
        return res.status(200).send(audioBuffer);

    } catch (error) {
        console.error('Edge TTS Error:', error);
        return res.status(500).json({
            error: error.message,
            tip: 'Emotions only work with English text and en-US voices. For other languages, use emotion: null or "neutral"'
        });
    }
}
