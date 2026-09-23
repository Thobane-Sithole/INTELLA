// API Helper Module - INTELLA
// Automatically switches between direct API calls (localhost) and serverless (production)

const API_MODE = window.location.hostname === 'localhost' ? 'direct' : 'serverless';

// Get API keys from CONFIG (only used in direct mode)
function getConfig() {
    return window.CONFIG || {};
}

// Gemini AI Call
export async function callGemini({ model, contents, generationConfig, tools, systemInstruction }) {
    const config = getConfig();

    if (API_MODE === 'direct') {
        // Direct API call for localhost development
        const geminiModel = model || 'gemini-2.0-flash';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${config.geminiApiKey}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents, generationConfig, tools, systemInstruction })
        });

        return await response.json();
    } else {
        // Serverless API call for production
        const response = await fetch('/api/gemini', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model, contents, generationConfig, tools, systemInstruction })
        });

        return await response.json();
    }
}

// Gemini Streaming Call
export async function callGeminiStream({ model, contents, generationConfig, tools, systemInstruction, onChunk }) {
    const config = getConfig();

    if (API_MODE === 'direct') {
        const geminiModel = model || 'gemini-2.0-flash';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:streamGenerateContent?alt=sse&key=${config.geminiApiKey}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents, generationConfig, tools, systemInstruction })
        });

        return response;
    } else {
        const response = await fetch('/api/gemini-stream', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model, contents, generationConfig, tools, systemInstruction })
        });

        return response;
    }
}

// ElevenLabs TTS Call
export async function callTTS({ text, voiceId, modelId }) {
    const config = getConfig();

    if (API_MODE === 'direct') {
        const voice = voiceId || 'nPczCjzI2devNBz1zQrb';
        const model = modelId || 'eleven_multilingual_v2';
        const url = `https://api.elevenlabs.io/v1/text-to-speech/${voice}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Accept': 'audio/mpeg',
                'Content-Type': 'application/json',
                'xi-api-key': config.elevenLabsApiKey
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

        const audioBuffer = await response.arrayBuffer();
        return {
            audioBuffer,
            contentType: 'audio/mpeg'
        };
    } else {
        const response = await fetch('/api/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, voiceId, modelId })
        });

        const data = await response.json();

        // Convert base64 back to ArrayBuffer
        const binaryString = atob(data.audio);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        return {
            audioBuffer: bytes.buffer,
            contentType: data.contentType
        };
    }
}

// Gemini Image Generation
export async function callImageGeneration({ prompt, language }) {
    const config = getConfig();

    if (API_MODE === 'direct') {
        const model = 'gemini-2.0-flash-exp-image-generation';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.geminiApiKey}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { responseModalities: ["TEXT", "IMAGE"] }
            })
        });

        return await response.json();
    } else {
        const response = await fetch('/api/image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt, language })
        });

        return await response.json();
    }
}

// Gemini Vision Analysis
export async function callVision({ imageData, mimeType, prompt }) {
    const config = getConfig();

    if (API_MODE === 'direct') {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${config.geminiApiKey}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { inline_data: { mime_type: mimeType || 'image/png', data: imageData } },
                        { text: prompt || 'Describe this image.' }
                    ]
                }]
            })
        });

        return await response.json();
    } else {
        const response = await fetch('/api/vision', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageData, mimeType, prompt })
        });

        return await response.json();
    }
}

// File Upload
export async function uploadFile({ fileData, mimeType, displayName }) {
    const config = getConfig();

    if (API_MODE === 'direct') {
        const url = `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${config.geminiApiKey}`;

        const buffer = Uint8Array.from(atob(fileData), c => c.charCodeAt(0));

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': mimeType,
                'X-Goog-Upload-Protocol': 'raw',
                'X-Goog-Upload-Command': 'upload, finalize',
                'X-Goog-Upload-Header-Content-Length': buffer.length.toString()
            },
            body: buffer
        });

        return await response.json();
    } else {
        const response = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileData, mimeType, displayName })
        });

        return await response.json();
    }
}

// Export API_MODE for checking
export { API_MODE };
