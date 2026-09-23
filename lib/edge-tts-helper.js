// Edge TTS Helper - Client-side utility to use Edge TTS
// Can switch between ElevenLabs and Edge TTS easily

class EdgeTTSHelper {
    constructor(apiEndpoint = '/api/edge-tts') {
        this.apiEndpoint = apiEndpoint;
        this.isAvailable = true;
    }

    /**
     * Generate speech using Edge TTS
     * @param {string} text - Text to convert to speech
     * @param {Object} options - TTS options
     * @param {string} options.language - Language (bengali, english, hindi, arabic)
     * @param {string} options.voice - Specific voice override
     * @param {string} options.emotion - Emotion for English voices (happy, sad, excited, angry, etc.)
     * @param {boolean} options.includeTimings - Return word timings for lip-sync
     * @returns {Promise<Object>} Audio blob or {audio, timings} if includeTimings is true
     */
    async generateSpeech(text, options = {}) {
        const {
            language = 'bengali',
            voice = null,
            emotion = null,
            includeTimings = false
        } = options;

        try {
            const response = await fetch(this.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    text,
                    language,
                    voice,
                    emotion,
                    includeTimings
                })
            });

            if (!response.ok) {
                let error;
                try {
                    error = await response.json();
                } catch {
                    error = { error: 'Edge TTS failed' };
                }
                throw new Error(error.error || 'Edge TTS failed');
            }

            // Check Content-Type to determine response format
            const contentType = response.headers.get('Content-Type') || '';

            if (contentType.includes('application/json')) {
                // JSON response with base64 audio and timings
                const data = await response.json();
                const audioBlob = this.base64ToBlob(data.audio, 'audio/mpeg');
                return {
                    audioBlob,
                    timings: data.timings || [],
                    voice: data.voice,
                    emotion: data.emotion
                };
            } else {
                // Binary audio response
                const audioBlob = await response.blob();
                return { audioBlob, timings: [] };
            }

        } catch (error) {
            console.error('Edge TTS Error:', error);
            throw error;
        }
    }

    /**
     * Convert base64 to Blob
     */
    base64ToBlob(base64, mimeType) {
        const byteCharacters = atob(base64);
        const byteArrays = [];

        for (let i = 0; i < byteCharacters.length; i++) {
            byteArrays.push(byteCharacters.charCodeAt(i));
        }

        return new Blob([new Uint8Array(byteArrays)], { type: mimeType });
    }

    /**
     * Quick speech generation - returns audio URL
     */
    async speak(text, language = 'bengali', emotion = null) {
        const { audioBlob } = await this.generateSpeech(text, { language, emotion });
        return URL.createObjectURL(audioBlob);
    }

    /**
     * Speech with lip-sync data
     */
    async speakWithLipSync(text, language = 'english', emotion = 'neutral') {
        const result = await this.generateSpeech(text, {
            language,
            emotion,
            includeTimings: true
        });

        return {
            audioUrl: URL.createObjectURL(result.audioBlob),
            timings: result.timings,
            voice: result.voice,
            emotion: result.emotion
        };
    }

    /**
     * Get available voices
     */
    getAvailableVoices() {
        return {
            bengali: ['bn-BD-NabanitaNeural', 'bn-BD-PradeepNeural'],
            english: ['en-US-EmmaMultilingualNeural', 'en-US-ChristopherNeural'],
            hindi: ['hi-IN-SwaraNeural'],
            arabic: ['ar-SA-ZariyahNeural']
        };
    }

    /**
     * Get available emotions (English only)
     */
    getAvailableEmotions() {
        return [
            'neutral',
            'happy',
            'excited',
            'sad',
            'angry',
            'friendly',
            'hopeful',
            'shouting',
            'terrified',
            'unfriendly',
            'whispering'
        ];
    }
}

// Make globally available for browser
if (typeof window !== 'undefined') {
    window.EdgeTTSHelper = EdgeTTSHelper;
}

// Export for Node.js/CommonJS
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EdgeTTSHelper;
}
