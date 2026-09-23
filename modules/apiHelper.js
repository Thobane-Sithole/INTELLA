// API Helper Module - INTELLA
// Routes AI calls to Claude (brain), Groq TTS/STT (voice), and serverless proxies

const API_MODE = window.location.hostname === 'localhost' ? 'direct' : 'serverless';

function getConfig() {
    return window.CONFIG || {};
}

// ─── Claude AI (replaces Gemini) ───────────────────────────────────────────

export async function callClaude({ model, messages, system, max_tokens, temperature }) {
    const config = getConfig();

    if (API_MODE === 'direct') {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'x-api-key': config.anthropicApiKey,
                'anthropic-version': '2023-06-01',
                'anthropic-dangerous-direct-browser-access': 'true',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: model || 'claude-sonnet-4-6',
                max_tokens: max_tokens || 1024,
                messages,
                ...(system && { system }),
                ...(temperature !== undefined && { temperature }),
            }),
        });
        return await response.json();
    } else {
        const response = await fetch('/api/claude', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model, messages, system, max_tokens, temperature }),
        });
        return await response.json();
    }
}

export async function callClaudeStream({ model, messages, system, max_tokens, temperature, onChunk }) {
    const config = getConfig();

    let response;
    if (API_MODE === 'direct') {
        response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'x-api-key': config.anthropicApiKey,
                'anthropic-version': '2023-06-01',
                'anthropic-dangerous-direct-browser-access': 'true',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: model || 'claude-sonnet-4-6',
                max_tokens: max_tokens || 1024,
                stream: true,
                messages,
                ...(system && { system }),
                ...(temperature !== undefined && { temperature }),
            }),
        });
    } else {
        response = await fetch('/api/claude', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model, messages, system, max_tokens, temperature, stream: true }),
        });
    }

    if (onChunk) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value);
            // Parse SSE lines for content_block_delta events
            for (const line of chunk.split('\n')) {
                if (!line.startsWith('data: ')) continue;
                const raw = line.slice(6).trim();
                if (raw === '[DONE]') continue;
                try {
                    const evt = JSON.parse(raw);
                    if (evt.type === 'content_block_delta' && evt.delta?.type === 'text_delta') {
                        fullText += evt.delta.text;
                        onChunk(evt.delta.text, fullText);
                    }
                } catch { /* ignore malformed lines */ }
            }
        }
        return fullText;
    }

    return response;
}

// Backward-compat aliases so existing app.js code keeps working
export async function callGemini(params) {
    // Map Gemini message format → Claude format
    const messages = (params.contents || []).map(c => ({
        role: c.role === 'model' ? 'assistant' : 'user',
        content: c.parts?.map(p => p.text || '').join('') || '',
    }));
    const system = params.systemInstruction?.parts?.[0]?.text;
    const max_tokens = params.generationConfig?.maxOutputTokens || 1024;
    return callClaude({ messages, system, max_tokens });
}

export async function callGeminiStream(params) {
    const messages = (params.contents || []).map(c => ({
        role: c.role === 'model' ? 'assistant' : 'user',
        content: c.parts?.map(p => p.text || '').join('') || '',
    }));
    const system = params.systemInstruction?.parts?.[0]?.text;
    const max_tokens = params.generationConfig?.maxOutputTokens || 1024;
    return callClaudeStream({ messages, system, max_tokens, onChunk: params.onChunk });
}

// ─── Groq TTS (replaces ElevenLabs) ───────────────────────────────────────

export async function callTTS({ text, voice, speed }) {
    const config = getConfig();
    const selectedVoice = voice || 'Fritz-PlayAI';

    if (API_MODE === 'direct') {
        const response = await fetch('https://api.groq.com/openai/v1/audio/speech', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${config.groqApiKey}`,
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
        return { audioBuffer: await response.arrayBuffer(), contentType: 'audio/wav' };
    } else {
        const response = await fetch('/api/groq-tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, voice: selectedVoice, speed }),
        });
        return { audioBuffer: await response.arrayBuffer(), contentType: 'audio/wav' };
    }
}

// ─── Groq STT (new) ────────────────────────────────────────────────────────

export async function callSTT({ audioBlob, language }) {
    const config = getConfig();
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.webm');
    formData.append('model', 'whisper-large-v3-turbo');
    if (language) formData.append('language', language);

    if (API_MODE === 'direct') {
        const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${config.groqApiKey}` },
            body: formData,
        });
        const data = await response.json();
        return data.text || '';
    } else {
        const response = await fetch('/api/groq-stt', {
            method: 'POST',
            body: formData,
        });
        const data = await response.json();
        return data.text || '';
    }
}

// ─── Neo4j Database ────────────────────────────────────────────────────────

export async function queryNeo4j({ query, parameters }) {
    const response = await fetch('/api/neo4j', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, parameters }),
    });
    return await response.json();
}

// ─── Vision (kept, still uses Claude's vision capability) ──────────────────

export async function callVision({ imageData, mimeType, prompt }) {
    const messages = [{
        role: 'user',
        content: [
            { type: 'image', source: { type: 'base64', media_type: mimeType || 'image/png', data: imageData } },
            { type: 'text', text: prompt || 'Describe this image.' },
        ],
    }];
    return callClaude({ messages, max_tokens: 512 });
}

// ─── Image generation (stub — Claude doesn't generate images) ─────────────

export async function callImageGeneration({ prompt }) {
    // Claude cannot generate images natively; return a placeholder response
    return callClaude({
        messages: [{ role: 'user', content: `Describe a detailed visual scene for: ${prompt}` }],
        max_tokens: 256,
    });
}

// ─── File upload (kept for compatibility, now a no-op stub) ───────────────

export async function uploadFile({ fileData, mimeType, displayName }) {
    console.warn('uploadFile: direct file uploads not supported with Claude. Use base64 via callVision instead.');
    return { name: displayName || 'file', mimeType };
}

export { API_MODE };
