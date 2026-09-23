/**
 * INTELLA Live Chat Module
 * Real-time voice conversation using Gemini Live API
 * Based on Google's Live API Web Console implementation
 */

// Audio processing utilities
function arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

function base64ToArrayBuffer(base64) {
    const binaryString = window.atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}

// Simple EventEmitter implementation
class EventEmitter {
    constructor() {
        this.events = {};
    }

    on(event, listener) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(listener);
        return this;
    }

    off(event, listener) {
        if (!this.events[event]) return this;
        this.events[event] = this.events[event].filter(l => l !== listener);
        return this;
    }

    emit(event, ...args) {
        if (!this.events[event]) return;
        this.events[event].forEach(listener => listener(...args));
    }
}

/**
 * Audio Recorder for capturing microphone input
 */
export class LiveAudioRecorder extends EventEmitter {
    constructor(sampleRate = 16000) {
        super();
        this.sampleRate = sampleRate;
        this.stream = null;
        this.audioContext = null;
        this.source = null;
        this.processor = null;
        this.recording = false;
    }

    async start() {
        if (this.recording) return;

        try {
            this.stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    channelCount: 1,
                    sampleRate: this.sampleRate,
                    echoCancellation: true,
                    noiseSuppression: true
                }
            });

            this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
                sampleRate: this.sampleRate
            });

            this.source = this.audioContext.createMediaStreamSource(this.stream);

            // Use ScriptProcessor for audio processing (works in all browsers)
            this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);

            this.processor.onaudioprocess = (e) => {
                if (!this.recording) return;

                const inputData = e.inputBuffer.getChannelData(0);

                // Convert Float32 to Int16
                const int16Array = new Int16Array(inputData.length);
                for (let i = 0; i < inputData.length; i++) {
                    const s = Math.max(-1, Math.min(1, inputData[i]));
                    int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
                }

                // Convert to base64 and emit
                const base64 = arrayBufferToBase64(int16Array.buffer);
                this.emit('data', base64);

                // Calculate volume for visualization
                let sum = 0;
                for (let i = 0; i < inputData.length; i++) {
                    sum += inputData[i] * inputData[i];
                }
                const volume = Math.sqrt(sum / inputData.length);
                this.emit('volume', volume);
            };

            this.source.connect(this.processor);
            this.processor.connect(this.audioContext.destination);

            this.recording = true;
            console.log('🎙️ Live audio recorder started');

        } catch (error) {
            console.error('Failed to start audio recorder:', error);
            throw error;
        }
    }

    stop() {
        this.recording = false;

        if (this.processor) {
            this.processor.disconnect();
            this.processor = null;
        }

        if (this.source) {
            this.source.disconnect();
            this.source = null;
        }

        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }

        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }

        console.log('🛑 Live audio recorder stopped');
    }
}

/**
 * Audio Streamer for playing received audio
 */
export class LiveAudioStreamer {
    constructor(sampleRate = 24000) {
        this.sampleRate = sampleRate;
        this.audioContext = null;
        this.audioQueue = [];
        this.isPlaying = false;
        this.scheduledTime = 0;
        this.bufferSize = 7680;
        this.initialBufferTime = 0.1;
        this.onComplete = () => { };

        // AnalyserNode-based amplitude for lip sync (reliable real-time)
        this.onAmplitude = null;  // Callback: (amplitude) => {} where amplitude is 0-1
        this.analyserNode = null;
        this.gainNode = null;
        this._amplitudeRAF = null;
        this._lastAmplitude = 0;
    }

    async init() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
                sampleRate: this.sampleRate
            });
        }
        // Ensure context is running
        if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }

        // Create AnalyserNode for real-time amplitude monitoring
        if (!this.analyserNode) {
            this.analyserNode = this.audioContext.createAnalyser();
            this.analyserNode.fftSize = 256;
            this.analyserNode.smoothingTimeConstant = 0.3;
            this.gainNode = this.audioContext.createGain();
            this.gainNode.gain.value = 1.0;
            // Route: source → gainNode → analyserNode → destination
            this.gainNode.connect(this.analyserNode);
            this.analyserNode.connect(this.audioContext.destination);
            console.log('🔊 AnalyserNode created for lip sync');
        }

        console.log('🔊 AudioStreamer initialized, state:', this.audioContext.state);
        return this;
    }

    /**
     * Start real-time amplitude monitoring using AnalyserNode
     * This polls the actual audio output - guaranteed to work when audio plays
     */
    startAmplitudeMonitoring() {
        if (!this.analyserNode || !this.onAmplitude) return;
        if (this._amplitudeRAF) return; // Already monitoring

        console.log('🎤 Starting AnalyserNode amplitude monitoring for lip sync');
        const dataArray = new Uint8Array(this.analyserNode.frequencyBinCount);

        const poll = () => {
            this._amplitudeRAF = requestAnimationFrame(poll);

            this.analyserNode.getByteTimeDomainData(dataArray);

            // Calculate RMS from waveform data (centered at 128)
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
                const sample = (dataArray[i] - 128) / 128;  // Normalize to -1..1
                sum += sample * sample;
            }
            const rms = Math.sqrt(sum / dataArray.length);
            const amplitude = Math.min(1, rms * 4);  // Scale up for visibility

            // Smooth
            const smoothed = this._lastAmplitude * 0.3 + amplitude * 0.7;
            this._lastAmplitude = smoothed;

            if (this.onAmplitude) {
                this.onAmplitude(smoothed);
            }
        };

        poll();
    }

    /**
     * Stop amplitude monitoring
     */
    stopAmplitudeMonitoring() {
        if (this._amplitudeRAF) {
            cancelAnimationFrame(this._amplitudeRAF);
            this._amplitudeRAF = null;
            this._lastAmplitude = 0;
            console.log('🎤 Stopped amplitude monitoring');
        }
    }

    addPCM16(chunk) {
        // CRITICAL: Resume AudioContext if suspended (browser autoplay policy)
        if (this.audioContext && this.audioContext.state === 'suspended') {
            console.log('🔊 AudioContext suspended, resuming...');
            this.audioContext.resume();
        }

        if (!this.audioContext) {
            console.error('❌ AudioContext not initialized!');
            return;
        }

        // Handle offset if chunk is a view into a larger buffer
        const chunkBuffer = chunk.buffer.slice(chunk.byteOffset, chunk.byteOffset + chunk.byteLength);

        // Convert Uint8Array (PCM16) to Float32Array
        const float32Array = new Float32Array(chunk.length / 2);
        const dataView = new DataView(chunkBuffer);

        for (let i = 0; i < chunk.length / 2; i++) {
            const int16 = dataView.getInt16(i * 2, true);
            float32Array[i] = int16 / 32768;
        }

        // Add to queue in chunks
        let processingBuffer = float32Array;
        while (processingBuffer.length >= this.bufferSize) {
            const buffer = processingBuffer.slice(0, this.bufferSize);
            this.audioQueue.push(buffer);
            processingBuffer = processingBuffer.slice(this.bufferSize);
        }

        if (processingBuffer.length > 0) {
            this.audioQueue.push(processingBuffer);
        }

        if (!this.isPlaying) {
            this.isPlaying = true;
            this.scheduledTime = this.audioContext.currentTime + this.initialBufferTime;
            this.scheduleNextBuffer();

            // Start amplitude monitoring when audio starts playing
            this.startAmplitudeMonitoring();
        }
    }

    scheduleNextBuffer() {
        const SCHEDULE_AHEAD_TIME = 0.2;

        while (
            this.audioQueue.length > 0 &&
            this.scheduledTime < this.audioContext.currentTime + SCHEDULE_AHEAD_TIME
        ) {
            const audioData = this.audioQueue.shift();
            const audioBuffer = this.audioContext.createBuffer(1, audioData.length, this.sampleRate);
            audioBuffer.getChannelData(0).set(audioData);

            const source = this.audioContext.createBufferSource();
            source.buffer = audioBuffer;
            // Route through gainNode → analyserNode → destination for amplitude monitoring
            if (this.gainNode) {
                source.connect(this.gainNode);
            } else {
                source.connect(this.audioContext.destination);
            }

            // Ensure we never schedule in the past
            const startTime = Math.max(this.scheduledTime, this.audioContext.currentTime);
            source.start(startTime);
            this.scheduledTime = startTime + audioBuffer.duration;

            // Handle completion
            if (this.audioQueue.length === 0) {
                source.onended = () => {
                    if (this.audioQueue.length === 0) {
                        this.isPlaying = false;
                        this.onComplete();
                    }
                };
            }
        }

        if (this.audioQueue.length > 0) {
            requestAnimationFrame(() => this.scheduleNextBuffer());
        }
    }

    stop() {
        this.audioQueue = [];
        this.isPlaying = false;
        this.stopAmplitudeMonitoring();
    }

    resume() {
        if (this.audioContext) {
            console.log('🔊 resume() called, AudioContext state:', this.audioContext.state);
            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume().then(() => {
                    console.log('🔊 AudioContext resumed successfully, new state:', this.audioContext.state);
                });
            }
        } else {
            console.error('❌ resume() called but AudioContext is null!');
        }
    }
}

/**
 * Fetch API key from serverless endpoint
 */
async function fetchLiveApiKey() {
    try {
        const response = await fetch('/api/live-token');
        if (!response.ok) {
            throw new Error('Failed to fetch Live API key');
        }
        const data = await response.json();
        console.log('🔑 Live API key fetched from server');
        return data;
    } catch (error) {
        console.error('Failed to fetch Live API key:', error);
        throw error;
    }
}

/**
 * Gemini Live API Client
 */
export class GeminiLiveClient extends EventEmitter {
    constructor(apiKey) {
        super();
        this.apiKey = apiKey;
        this.ws = null;
        this.status = 'disconnected';
        this.model = 'models/gemini-2.5-flash-native-audio-preview-12-2025';
        this.config = null;
        this.currentTranscript = '';
        this.userTranscript = '';
    }

    async connect(config = {}) {
        if (this.status === 'connected' || this.status === 'connecting') {
            return false;
        }

        this.status = 'connecting';
        this.config = config;

        const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${this.apiKey}`;

        return new Promise((resolve, reject) => {
            try {
                this.ws = new WebSocket(wsUrl);

                // Store resolve/reject for use in handleMessage
                this._connectResolve = resolve;
                this._connectReject = reject;

                this.ws.onopen = () => {
                    console.log('🔗 WebSocket connected');

                    // Send setup message
                    const setupMessage = {
                        setup: {
                            model: this.model,
                            generationConfig: {
                                responseModalities: ["AUDIO"],
                                speechConfig: {
                                    voiceConfig: {
                                        prebuiltVoiceConfig: {
                                            voiceName: config.voiceName || "Aoede"
                                        }
                                    }
                                }
                            },
                            // Enable transcription for both input (user speech) and output (AI speech)
                            inputAudioTranscription: {},
                            outputAudioTranscription: {},
                            systemInstruction: {
                                parts: [{
                                    text: config.systemInstruction || `You are INTELLA, a friendly AI teacher.

IMPORTANT - YOU HAVE FUNCTION CALLING TOOLS:
- When student asks for quiz/practice/test → ALWAYS call generate_quiz function
- When student asks to draw/show/visualize/image → ALWAYS call generate_image function
- When student asks for flashcards → ALWAYS call generate_flashcards function
- When student asks about progress → ALWAYS call show_student_progress function

NEVER say "I cannot generate images" or "I cannot create quizzes" - you CAN by calling the functions.

Be warm, explain simply, keep responses concise.`
                                }]
                            },
                            tools: config.tools || []
                        }
                    };

                    console.log('📤 Setup message tools:', JSON.stringify(setupMessage.setup.tools, null, 2));
                    this.ws.send(JSON.stringify(setupMessage));
                };

                this.ws.onmessage = async (event) => {
                    try {
                        // Handle both Blob and text messages
                        let text;
                        if (event.data instanceof Blob) {
                            text = await event.data.text();
                        } else {
                            text = event.data;
                        }
                        console.log('📩 Raw message received, length:', text.length);
                        const data = JSON.parse(text);
                        console.log('📩 Parsed message keys:', Object.keys(data));
                        this.handleMessage(data);
                    } catch (e) {
                        console.error('Failed to parse message:', e);
                    }
                };

                this.ws.onerror = (error) => {
                    console.error('WebSocket error:', error);
                    this.status = 'disconnected';
                    this.emit('error', error);
                    reject(error);
                };

                this.ws.onclose = (event) => {
                    console.log('WebSocket closed:', event.reason);
                    this.status = 'disconnected';
                    this.emit('close', event);
                    // Reject if still waiting for setup
                    if (this._connectReject) {
                        this._connectReject(new Error(event.reason || 'WebSocket closed'));
                        this._connectReject = null;
                    }
                };

            } catch (error) {
                this.status = 'disconnected';
                reject(error);
            }
        });
    }

    handleMessage(data) {
        // Setup complete
        if (data.setupComplete) {
            console.log('✅ Live API setup complete');
            this.status = 'connected';
            this.emit('open');
            this.emit('setupcomplete');
            // Resolve the connect promise
            if (this._connectResolve) {
                this._connectResolve(true);
                this._connectResolve = null;
            }
            return;
        }

        // Server content
        if (data.serverContent) {
            const content = data.serverContent;
            console.log('📩 serverContent keys:', Object.keys(content));

            // Interrupted
            if (content.interrupted) {
                console.log('⚠️ Response interrupted');
                this.emit('interrupted');
                return;
            }

            // Turn complete
            if (content.turnComplete) {
                console.log('✅ Turn complete');
                this.emit('turncomplete');

                // Emit user transcript FIRST (user spoke before AI responded)
                if (this.userTranscript) {
                    this.emit('usertranscript', this.userTranscript);
                    this.userTranscript = '';
                }
                // Then emit AI transcript
                if (this.currentTranscript) {
                    this.emit('aitranscript', this.currentTranscript);
                    this.currentTranscript = '';
                }
                return;
            }

            // Input transcription (what user said)
            if (content.inputTranscription && content.inputTranscription.text) {
                console.log('🎤 User said:', content.inputTranscription.text);
                this.userTranscript += content.inputTranscription.text;
                this.emit('userinput', content.inputTranscription.text);
            }

            // Output transcription (what AI said - text version of audio)
            if (content.outputTranscription && content.outputTranscription.text) {
                console.log('🤖 AI said:', content.outputTranscription.text);
                this.currentTranscript += content.outputTranscription.text;
                this.emit('aioutput', content.outputTranscription.text);
            }

            // Model turn with content
            if (content.modelTurn && content.modelTurn.parts) {
                console.log('📩 modelTurn parts count:', content.modelTurn.parts.length);
                for (const part of content.modelTurn.parts) {
                    console.log('📩 Part keys:', Object.keys(part));
                    // Audio data - only emit audio, NOT text (text comes from outputTranscription)
                    if (part.inlineData && part.inlineData.mimeType?.startsWith('audio/')) {
                        console.log('🔊 Audio received:', part.inlineData.mimeType, 'size:', part.inlineData.data?.length || 0);
                        const audioData = base64ToArrayBuffer(part.inlineData.data);
                        this.emit('audio', audioData);
                    }

                    // Skip model thinking text - we use outputTranscription instead for clean speech text
                    // if (part.text) { ... } - deliberately removed to avoid showing "Crafting Bengali Response" etc.
                }
            }
        }

        // Tool call
        if (data.toolCall) {
            console.log('🔧 TOOL CALL RECEIVED:', JSON.stringify(data.toolCall, null, 2));
            this.emit('toolcall', data.toolCall);
        }
    }

    /**
     * Send realtime audio input
     */
    sendAudio(base64Audio) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            const message = {
                realtimeInput: {
                    mediaChunks: [{
                        mimeType: "audio/pcm;rate=16000",
                        data: base64Audio
                    }]
                }
            };
            this.ws.send(JSON.stringify(message));
        }
    }

    /**
     * Send text message
     */
    sendText(text) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            const message = {
                clientContent: {
                    turns: [{
                        role: "user",
                        parts: [{ text }]
                    }],
                    turnComplete: true
                }
            };
            this.ws.send(JSON.stringify(message));
            console.log('📤 Sent text:', text);
        }
    }

    /**
     * Send image with optional text
     */
    sendImage(base64Image, mimeType = 'image/jpeg', text = '') {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            const parts = [];

            if (text) {
                parts.push({ text });
            }

            parts.push({
                inlineData: {
                    mimeType,
                    data: base64Image
                }
            });

            const message = {
                clientContent: {
                    turns: [{
                        role: "user",
                        parts
                    }],
                    turnComplete: true
                }
            };
            this.ws.send(JSON.stringify(message));
            console.log('📤 Sent image');
        }
    }

    /**
     * Send tool response
     */
    sendToolResponse(functionResponses) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            const message = {
                toolResponse: {
                    functionResponses
                }
            };
            this.ws.send(JSON.stringify(message));
        }
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.status = 'disconnected';
        console.log('🔌 Disconnected from Live API');
    }

    isConnected() {
        return this.status === 'connected' && this.ws?.readyState === WebSocket.OPEN;
    }
}

/**
 * INTELLA Live Chat Controller
 * Manages the Live API session with audio streaming
 */
export class LiveChatController {
    constructor(apiKey, options = {}) {
        this.apiKey = apiKey;
        this.options = options;

        this.client = null;
        this.audioRecorder = new LiveAudioRecorder();
        this.audioStreamer = new LiveAudioStreamer();

        this.isActive = false;
        this.isMuted = false;
        this.isAISpeaking = false;
        this.streamStarted = false;
        this.streamReady = false;
        this.pendingAudioChunks = [];

        // Callbacks
        this.onUserSpeaking = options.onUserSpeaking || (() => { });
        this.onAIResponse = options.onAIResponse || (() => { });
        this.onStatusChange = options.onStatusChange || (() => { });
        this.onVolumeChange = options.onVolumeChange || (() => { });
        this.onTranscript = options.onTranscript || (() => { });
        this.onUserTranscript = options.onUserTranscript || (() => { });
        this.onAITranscript = options.onAITranscript || (() => { });
        this.onError = options.onError || (() => { });
        this.onToolCall = options.onToolCall || null;  // Tool/function calling callback

        // Lip sync callbacks for TalkingHead integration
        this.onAudioChunk = options.onAudioChunk || null;  // Raw PCM for lip sync
        this.onAmplitude = options.onAmplitude || null;  // Audio amplitude (0-1) for real-time lip sync
        this.onStreamStart = options.onStreamStart || (async () => { });  // Async callback
        this.onStreamEnd = options.onStreamEnd || (() => { });
        this.onInterrupted = options.onInterrupted || (() => { });  // Called when user interrupts AI
    }

    async start() {
        if (this.isActive) return;

        try {
            this.onStatusChange('connecting');

            // Fetch API key from serverless endpoint if not provided
            let apiKey = this.apiKey;
            if (!apiKey) {
                console.log('🔑 Fetching Live API key from server...');
                const tokenData = await fetchLiveApiKey();
                apiKey = tokenData.apiKey;
            }

            // Initialize client
            this.client = new GeminiLiveClient(apiKey);

            // Initialize audio streamer
            await this.audioStreamer.init();

            // Set up amplitude callback for lip sync
            if (this.onAmplitude) {
                this.audioStreamer.onAmplitude = this.onAmplitude;
                console.log('✅ Amplitude callback set on audioStreamer');
            } else {
                console.log('⚠️ No onAmplitude callback provided in options');
            }

            // Set up event handlers
            this.client.on('open', () => {
                console.log('🎉 Live chat connected');
                this.isActive = true;
                this.onStatusChange('connected');
            });

            this.client.on('audio', async (data) => {
                this.isAISpeaking = true;

                // Start stream on first audio chunk (wait for it to initialize)
                if (!this.streamStarted) {
                    this.streamStarted = true;
                    this.streamReady = false;
                    this.pendingAudioChunks = [];

                    // Buffer the first chunk
                    this.pendingAudioChunks.push(data);

                    // Wait for stream to initialize (TalkingHead streamStart or fallback)
                    try {
                        await this.onStreamStart();
                        this.streamReady = true;
                        console.log('🔊 Stream ready, processing buffered audio chunks:', this.pendingAudioChunks.length);

                        // Process buffered audio chunks
                        for (const chunk of this.pendingAudioChunks) {
                            const pcm = new Uint8Array(chunk);
                            if (this.onAudioChunk) {
                                // TalkingHead handles both audio playback AND lip sync
                                this.onAudioChunk(pcm);
                            } else {
                                // Fallback: play via custom AudioStreamer (no lip sync)
                                this.audioStreamer.addPCM16(pcm);
                            }
                        }
                        this.pendingAudioChunks = [];
                    } catch (e) {
                        console.error('Failed to start stream:', e);
                        this.streamReady = true;
                    }
                    return;
                }

                // Buffer if not ready yet
                if (!this.streamReady) {
                    this.pendingAudioChunks.push(data);
                    return;
                }

                // Route audio: TalkingHead (with lip sync) or fallback AudioStreamer
                const pcm = new Uint8Array(data);
                if (this.onAudioChunk) {
                    this.onAudioChunk(pcm);
                } else {
                    this.audioStreamer.addPCM16(pcm);
                }
            });

            this.client.on('content', (content) => {
                if (content.text) {
                    this.onAIResponse(content.text, false);
                }
            });

            // User input transcription (real-time)
            this.client.on('userinput', (text) => {
                this.onUserTranscript(text, false);
            });

            // AI output transcription (real-time)
            this.client.on('aioutput', (text) => {
                this.onAITranscript(text, false);
            });

            // Complete user transcript
            this.client.on('usertranscript', (transcript) => {
                this.onUserTranscript(transcript, true);
            });

            // Complete AI transcript
            this.client.on('aitranscript', (transcript) => {
                this.onTranscript(transcript);
                this.onAITranscript(transcript, true);
                this.onAIResponse(transcript, true);
            });

            this.client.on('turncomplete', () => {
                this.isAISpeaking = false;
                // End stream when turn completes
                if (this.streamStarted) {
                    this.streamStarted = false;
                    this.streamReady = false;
                    this.pendingAudioChunks = [];
                    this.onStreamEnd();
                }
            });

            this.client.on('interrupted', () => {
                this.audioStreamer.stop();
                this.isAISpeaking = false;
                // Immediately stop on interruption (not graceful end)
                if (this.streamStarted) {
                    this.streamStarted = false;
                    this.streamReady = false;
                    this.pendingAudioChunks = [];
                    this.onInterrupted();
                }
            });

            this.client.on('error', (error) => {
                console.error('Live API error:', error);
                this.onError(error);
            });

            this.client.on('close', () => {
                this.isActive = false;
                this.onStatusChange('disconnected');
            });

            // Tool/function call from AI
            this.client.on('toolcall', async (toolCall) => {
                console.log('🔧 Tool call received from AI:', toolCall);
                if (this.onToolCall) {
                    await this.onToolCall(toolCall);
                }
            });

            // Audio streamer complete callback
            this.audioStreamer.onComplete = () => {
                this.isAISpeaking = false;
            };

            // Connect to Live API with tools
            await this.client.connect({
                systemInstruction: this.options.systemInstruction,
                voiceName: this.options.voiceName || "Aoede",
                tools: this.options.tools || []
            });

            // Start audio recording
            this.audioRecorder.on('data', (base64) => {
                if (!this.isMuted && this.isActive) {
                    this.client.sendAudio(base64);
                }
            });

            this.audioRecorder.on('volume', (volume) => {
                this.onVolumeChange(volume);
                if (volume > 0.01 && !this.isMuted) {
                    this.onUserSpeaking(true);
                }
            });

            await this.audioRecorder.start();

        } catch (error) {
            console.error('Failed to start live chat:', error);
            this.onError(error);
            this.onStatusChange('error');
            throw error;
        }
    }

    stop() {
        this.isActive = false;

        this.audioRecorder.stop();
        this.audioStreamer.stop();

        if (this.client) {
            this.client.disconnect();
            this.client = null;
        }

        this.onStatusChange('disconnected');
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        return this.isMuted;
    }

    setMuted(muted) {
        this.isMuted = muted;
    }

    /**
     * Send a text message in Live mode
     */
    sendText(text) {
        if (this.client && this.isActive) {
            this.client.sendText(text);
        }
    }

    /**
     * Send an image with optional text
     */
    sendImage(base64Image, mimeType = 'image/jpeg', text = '') {
        if (this.client && this.isActive) {
            this.client.sendImage(base64Image, mimeType, text);
        }
    }

    /**
     * Send tool/function call responses back to the AI
     */
    sendToolResponse(functionResponses) {
        if (this.client && this.isActive) {
            this.client.sendToolResponse(functionResponses);
        }
    }

    /**
     * Resume audio context (needed after user interaction)
     */
    resumeAudio() {
        this.audioStreamer.resume();
    }
}

// Export default instance creator
export function createLiveChatController(apiKey, options) {
    return new LiveChatController(apiKey, options);
}
