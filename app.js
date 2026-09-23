

import { TalkingHead } from "./modules/intellaHead.js";
import { marked } from "marked";
import dompurify from "dompurify";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";


const API_MODE = window.location.hostname === 'localhost' ? 'direct' : 'serverless';

import {
    initAuth,
    loginWithEmail,
    signupWithEmail,
    loginWithGoogle,
    logout,
    getCurrentUser,
    getUserProfile,
    saveProgress,
    loadProgress,
    saveChatHistory,
    loadChatHistory,
    loadChat,
    updateChatHistory,
    deleteChat,
    renameChat,
    getCurrentChatId,
    setCurrentChatId,
    saveQuizResult,
    saveStudentProfileToFirestore,
    loadStudentProfileFromFirestore,
    resetPassword,
    uploadProfilePicture,
    updateDisplayName,
    showUserProfile,
    showLoginForm,
    saveLearningState,
    loadLearningState,
    getCachedAuthState,
    updateHeaderAuthUI,
    // Textbook Library functions
    getTextbooks,
    checkTextbookExists,
    checkUniversityTextbookExists,
    uploadTextbook,
    saveTextbookChapters,
    getTextbookChapters,
    searchChapters
} from './auth.js';


import { detectIntent, extractCurriculumInfo, getModeButtons, INTENT_TYPES } from "./modules/intentDetector.js";
import {
    CURRICULUM_DATA,
    COUNTRIES,
    EDUCATION_LEVELS,
    ACADEMIC_STREAMS,
    UNIVERSITY_DEPARTMENTS,
    getSubjectsForClass,
    searchCurriculum,
    getCountry,
    getEducationLevel,
    getUniversityProgram,
    getDepartmentPrograms,
    getSubjectsForProfile,
    searchCountries
} from "./modules/curriculumData.js";
import { progressTracker, MASTERY_LEVELS } from "./modules/progressTracker.js";
import { quizEngine } from "./modules/quizEngine.js";
import * as IntellaDB from "./modules/database.js";
import { LiveChatController } from "./modules/liveChat.js";


import {
    initPayments,
    getUserCredits,
    deductCredits,
    canPerformAction,
    showSubscriptionPlans,
    showCreditsInfo,
    showUpgradePrompt,
    updateCreditsDisplay,
    CREDIT_COSTS,
    setUserCurrency,
    getCurrentCurrency,
    formatPrice,
    getPlanPrice,
    getPackagePrice
} from "./modules/payments.js";

// Make updateCreditsDisplay globally available for auth.js
window.updateCreditsDisplay = updateCreditsDisplay;

// ===========================================

// Production detection - use serverless API endpoints on Vercel
const IS_PRODUCTION = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';

// Make currency functions globally available
window.setUserCurrency = setUserCurrency;
window.getCurrentCurrency = getCurrentCurrency;
window.formatPrice = formatPrice;
window.getPlanPrice = getPlanPrice;
window.getPackagePrice = getPackagePrice;
console.log("🌐 Environment:", IS_PRODUCTION ? "PRODUCTION (using serverless APIs)" : "LOCAL (using direct APIs)");

const CONFIG = {
    // Production mode flag
    isProduction: IS_PRODUCTION,

    // API Endpoints
    geminiEndpoint: "https://generativelanguage.googleapis.com/v1beta/models/",
    geminiLiveEndpoint: "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent",
    googleTTSEndpoint: "https://texttospeech.googleapis.com/v1/text:synthesize",
    elevenLabsEndpoint: "https://api.elevenlabs.io/v1",


    models: {

        chat: "gemini-3-flash-preview",

        // Gemini 3 Flash - Research with Google Search grounding
        research: "gemini-3-flash-preview",


        document: "gemini-3-flash-preview",


        imageGen: "gemini-3-pro-image-preview",

        // Gemini 2.5 Flash - Fallback for unsupported features (image segmentation, etc.)
        fallback: "gemini-2.5-flash-preview-05-20",


        live: "gemini-2.5-flash-native-audio-preview-12-2025"
    },

    // ============================================
    // API KEYS - FOR LOCAL DEVELOPMENT ONLY
    // ============================================
    // In production (Vercel), API calls go through serverless functions
    // and keys are stored securely in Vercel Environment Variables.
    // 
    // For local testing, replace these with your own API keys:
    // - Get Gemini API key: https://aistudio.google.com/apikey
    // - Get ElevenLabs API key: https://elevenlabs.io/api
    // ============================================
    geminiApiKey: "AIzaSyCPFGigo2pZbgxwz3jy_z9vhFjLJ1B1V1s",
    elevenLabsApiKey: "YOUR_ELEVENLABS_API_KEY_HERE",

    // Serverless API endpoints (used in production)
    apiEndpoints: {
        gemini: '/api/gemini',
        geminiStream: '/api/gemini-stream',
        tts: '/api/tts',
        googleTts: '/api/google-tts',  // Google Cloud TTS
        image: '/api/image',
        vision: '/api/vision',
        upload: '/api/upload'
    },

    // Teacher Avatars - Male (Sir Abubokkor) and Female (Ma'am Queen)
    teacherAvatars: {
        male: {
            url: "./avatar/69435286403c000063429870.glb",
            name: "Abubokkor",
            title: "Sir",
            body: "M",
            ttsVoice: "en-GB-Standard-D",
            elevenLabsVoice: "pNInz6obpgDQGcFmaJgB"
        },
        female: {
            url: "./avatar/694febf38f9c70cbc97ec46e.glb",
            name: "Queen",
            title: "Ma'am",
            body: "F",
            ttsVoice: "en-GB-Standard-A",
            elevenLabsVoice: "21m00Tcm4TlvDq8ikWAM" // Rachel (female)
        }
    },


    currentTeacher: "male",


    avatarUrl: "./avatar/69435286403c000063429870.glb",

    // Classroom background URL
    classroomUrl: "./avatar/classroom_default.glb",


    tts: {
        enabled: true,
        provider: "google",  // "google" (PRIMARY) | "edge" (FREE fallback) | "elevenlabs" (PAID)

        // Google Cloud TTS Settings (PRIMARY - Fast & Reliable)
        // Chirp3-HD voices are multilingual (English, Bengali, Hindi, etc.)
        googleVoice: "en-US-Wavenet-D",
        googleVoiceMale: "en-US-Chirp3-HD-Orus",    // Orus - Deep male voice (multilingual)
        googleVoiceFemale: "en-US-Chirp3-HD-Aoede",  // Aoede - Natural female voice (multilingual)
        speakingRate: 1.0,
        pitch: 0,           // -20.0 to 20.0

        // ElevenLabs Settings (High Quality, Paid)
        //         "eleven_multilingual_v2" (29 languages, NO Bengali)
        elevenLabsModel: "eleven_v3",
        elevenLabsVoice: "pNInz6obpgDQGcFmaJgB",  // Adam (multilingual)
        stability: 0.5,
        similarityBoost: 0.75,

        // Edge TTS Settings (FREE, 70+ languages)
        edgeEmotion: "friendly",  // For English: happy, sad, excited, angry, friendly, etc.

        // Edge TTS Voice Selection (HD Neural Voices)
        // User can override in settings, defaults to best HD voice per language
        edgeVoice: null,  // Will be set based on teacher gender + language

        language: "en"      // Will auto-detect from text
    },


    teacherStyle: "friendly",
    subjectFocus: "general"
};

// ============================================
// EDGE TTS - ALL 100+ COUNTRIES/LANGUAGES
// Best HD Neural Voices (Female & Male defaults)
// ============================================
const EDGE_TTS_VOICES = {
    // === SOUTH ASIAN ===
    'bn-BD': { name: 'Bengali (Bangladesh)', female: 'bn-BD-NabanitaNeural', male: 'bn-BD-PradeepNeural', speechRecognition: 'bn-BD' },
    'bn-IN': { name: 'Bengali (India)', female: 'bn-IN-TanishaaNeural', male: 'bn-IN-BashkarNeural', speechRecognition: 'bn-IN' },
    'hi-IN': { name: 'Hindi', female: 'hi-IN-SwaraNeural', male: 'hi-IN-MadhurNeural', speechRecognition: 'hi-IN' },
    'ta-IN': { name: 'Tamil (India)', female: 'ta-IN-PallaviNeural', male: 'ta-IN-ValluvarNeural', speechRecognition: 'ta-IN' },
    'ta-MY': { name: 'Tamil (Malaysia)', female: 'ta-MY-KaniNeural', male: 'ta-MY-SuryaNeural', speechRecognition: 'ta-MY' },
    'ta-SG': { name: 'Tamil (Singapore)', female: 'ta-SG-VenbaNeural', male: 'ta-SG-AnbuNeural', speechRecognition: 'ta-SG' },
    'ta-LK': { name: 'Tamil (Sri Lanka)', female: 'ta-LK-SaranyaNeural', male: 'ta-LK-KumarNeural', speechRecognition: 'ta-LK' },
    'te-IN': { name: 'Telugu', female: 'te-IN-ShrutiNeural', male: 'te-IN-MohanNeural', speechRecognition: 'te-IN' },
    'mr-IN': { name: 'Marathi', female: 'mr-IN-AarohiNeural', male: 'mr-IN-ManoharNeural', speechRecognition: 'mr-IN' },
    'gu-IN': { name: 'Gujarati', female: 'gu-IN-DhwaniNeural', male: 'gu-IN-NiranjanNeural', speechRecognition: 'gu-IN' },
    'kn-IN': { name: 'Kannada', female: 'kn-IN-SapnaNeural', male: 'kn-IN-GaganNeural', speechRecognition: 'kn-IN' },
    'ml-IN': { name: 'Malayalam', female: 'ml-IN-SobhanaNeural', male: 'ml-IN-MidhunNeural', speechRecognition: 'ml-IN' },
    'ne-NP': { name: 'Nepali', female: 'ne-NP-HemkalaNeural', male: 'ne-NP-SagarNeural', speechRecognition: 'ne-NP' },
    'si-LK': { name: 'Sinhala', female: 'si-LK-ThiliniNeural', male: 'si-LK-SameeraNeural', speechRecognition: 'si-LK' },
    'ur-IN': { name: 'Urdu (India)', female: 'ur-IN-GulNeural', male: 'ur-IN-SalmanNeural', speechRecognition: 'ur-IN' },
    'ur-PK': { name: 'Urdu (Pakistan)', female: 'ur-PK-UzmaNeural', male: 'ur-PK-AsadNeural', speechRecognition: 'ur-PK' },

    // === ENGLISH VARIANTS (HD Multilingual) ===
    'en-US': { name: 'English (US)', female: 'en-US-AvaMultilingualNeural', male: 'en-US-AndrewMultilingualNeural', speechRecognition: 'en-US' },
    'en-GB': { name: 'English (UK)', female: 'en-GB-SoniaNeural', male: 'en-GB-RyanNeural', speechRecognition: 'en-GB' },
    'en-AU': { name: 'English (Australia)', female: 'en-AU-NatashaNeural', male: 'en-AU-WilliamMultilingualNeural', speechRecognition: 'en-AU' },
    'en-CA': { name: 'English (Canada)', female: 'en-CA-ClaraNeural', male: 'en-CA-LiamNeural', speechRecognition: 'en-CA' },
    'en-IN': { name: 'English (India)', female: 'en-IN-NeerjaExpressiveNeural', male: 'en-IN-PrabhatNeural', speechRecognition: 'en-IN' },
    'en-IE': { name: 'English (Ireland)', female: 'en-IE-EmilyNeural', male: 'en-IE-ConnorNeural', speechRecognition: 'en-IE' },
    'en-NZ': { name: 'English (New Zealand)', female: 'en-NZ-MollyNeural', male: 'en-NZ-MitchellNeural', speechRecognition: 'en-NZ' },
    'en-PH': { name: 'English (Philippines)', female: 'en-PH-RosaNeural', male: 'en-PH-JamesNeural', speechRecognition: 'en-PH' },
    'en-SG': { name: 'English (Singapore)', female: 'en-SG-LunaNeural', male: 'en-SG-WayneNeural', speechRecognition: 'en-SG' },
    'en-ZA': { name: 'English (South Africa)', female: 'en-ZA-LeahNeural', male: 'en-ZA-LukeNeural', speechRecognition: 'en-ZA' },
    'en-HK': { name: 'English (Hong Kong)', female: 'en-HK-YanNeural', male: 'en-HK-SamNeural', speechRecognition: 'en-HK' },
    'en-KE': { name: 'English (Kenya)', female: 'en-KE-AsiliaNeural', male: 'en-KE-ChilembaNeural', speechRecognition: 'en-KE' },
    'en-NG': { name: 'English (Nigeria)', female: 'en-NG-EzinneNeural', male: 'en-NG-AbeoNeural', speechRecognition: 'en-NG' },
    'en-TZ': { name: 'English (Tanzania)', female: 'en-TZ-ImaniNeural', male: 'en-TZ-ElimuNeural', speechRecognition: 'en-TZ' },

    // === EUROPEAN LANGUAGES (HD Multilingual) ===
    'fr-FR': { name: 'French (France)', female: 'fr-FR-VivienneMultilingualNeural', male: 'fr-FR-RemyMultilingualNeural', speechRecognition: 'fr-FR' },
    'fr-CA': { name: 'French (Canada)', female: 'fr-CA-SylvieNeural', male: 'fr-CA-ThierryNeural', speechRecognition: 'fr-CA' },
    'fr-BE': { name: 'French (Belgium)', female: 'fr-BE-CharlineNeural', male: 'fr-BE-GerardNeural', speechRecognition: 'fr-BE' },
    'fr-CH': { name: 'French (Switzerland)', female: 'fr-CH-ArianeNeural', male: 'fr-CH-FabriceNeural', speechRecognition: 'fr-CH' },
    'de-DE': { name: 'German (Germany)', female: 'de-DE-SeraphinaMultilingualNeural', male: 'de-DE-FlorianMultilingualNeural', speechRecognition: 'de-DE' },
    'de-AT': { name: 'German (Austria)', female: 'de-AT-IngridNeural', male: 'de-AT-JonasNeural', speechRecognition: 'de-AT' },
    'de-CH': { name: 'German (Switzerland)', female: 'de-CH-LeniNeural', male: 'de-CH-JanNeural', speechRecognition: 'de-CH' },
    'es-ES': { name: 'Spanish (Spain)', female: 'es-ES-ElviraNeural', male: 'es-ES-AlvaroNeural', speechRecognition: 'es-ES' },
    'es-MX': { name: 'Spanish (Mexico)', female: 'es-MX-DaliaNeural', male: 'es-MX-JorgeNeural', speechRecognition: 'es-MX' },
    'es-AR': { name: 'Spanish (Argentina)', female: 'es-AR-ElenaNeural', male: 'es-AR-TomasNeural', speechRecognition: 'es-AR' },
    'es-CO': { name: 'Spanish (Colombia)', female: 'es-CO-SalomeNeural', male: 'es-CO-GonzaloNeural', speechRecognition: 'es-CO' },
    'es-CL': { name: 'Spanish (Chile)', female: 'es-CL-CatalinaNeural', male: 'es-CL-LorenzoNeural', speechRecognition: 'es-CL' },
    'es-PE': { name: 'Spanish (Peru)', female: 'es-PE-CamilaNeural', male: 'es-PE-AlexNeural', speechRecognition: 'es-PE' },
    'es-US': { name: 'Spanish (US)', female: 'es-US-PalomaNeural', male: 'es-US-AlonsoNeural', speechRecognition: 'es-US' },
    'es-VE': { name: 'Spanish (Venezuela)', female: 'es-VE-PaolaNeural', male: 'es-VE-SebastianNeural', speechRecognition: 'es-VE' },
    'it-IT': { name: 'Italian', female: 'it-IT-ElsaNeural', male: 'it-IT-GiuseppeMultilingualNeural', speechRecognition: 'it-IT' },
    'pt-BR': { name: 'Portuguese (Brazil)', female: 'pt-BR-ThalitaMultilingualNeural', male: 'pt-BR-AntonioNeural', speechRecognition: 'pt-BR' },
    'pt-PT': { name: 'Portuguese (Portugal)', female: 'pt-PT-RaquelNeural', male: 'pt-PT-DuarteNeural', speechRecognition: 'pt-PT' },
    'nl-NL': { name: 'Dutch (Netherlands)', female: 'nl-NL-FennaNeural', male: 'nl-NL-MaartenNeural', speechRecognition: 'nl-NL' },
    'nl-BE': { name: 'Dutch (Belgium)', female: 'nl-BE-DenaNeural', male: 'nl-BE-ArnaudNeural', speechRecognition: 'nl-BE' },
    'pl-PL': { name: 'Polish', female: 'pl-PL-ZofiaNeural', male: 'pl-PL-MarekNeural', speechRecognition: 'pl-PL' },
    'ru-RU': { name: 'Russian', female: 'ru-RU-SvetlanaNeural', male: 'ru-RU-DmitryNeural', speechRecognition: 'ru-RU' },
    'uk-UA': { name: 'Ukrainian', female: 'uk-UA-PolinaNeural', male: 'uk-UA-OstapNeural', speechRecognition: 'uk-UA' },
    'cs-CZ': { name: 'Czech', female: 'cs-CZ-VlastaNeural', male: 'cs-CZ-AntoninNeural', speechRecognition: 'cs-CZ' },
    'sk-SK': { name: 'Slovak', female: 'sk-SK-ViktoriaNeural', male: 'sk-SK-LukasNeural', speechRecognition: 'sk-SK' },
    'hu-HU': { name: 'Hungarian', female: 'hu-HU-NoemiNeural', male: 'hu-HU-TamasNeural', speechRecognition: 'hu-HU' },
    'ro-RO': { name: 'Romanian', female: 'ro-RO-AlinaNeural', male: 'ro-RO-EmilNeural', speechRecognition: 'ro-RO' },
    'bg-BG': { name: 'Bulgarian', female: 'bg-BG-KalinaNeural', male: 'bg-BG-BorislavNeural', speechRecognition: 'bg-BG' },
    'hr-HR': { name: 'Croatian', female: 'hr-HR-GabrijelaNeural', male: 'hr-HR-SreckoNeural', speechRecognition: 'hr-HR' },
    'sr-RS': { name: 'Serbian', female: 'sr-RS-SophieNeural', male: 'sr-RS-NicholasNeural', speechRecognition: 'sr-RS' },
    'sl-SI': { name: 'Slovenian', female: 'sl-SI-PetraNeural', male: 'sl-SI-RokNeural', speechRecognition: 'sl-SI' },
    'bs-BA': { name: 'Bosnian', female: 'bs-BA-VesnaNeural', male: 'bs-BA-GoranNeural', speechRecognition: 'bs-BA' },
    'mk-MK': { name: 'Macedonian', female: 'mk-MK-MarijaNeural', male: 'mk-MK-AleksandarNeural', speechRecognition: 'mk-MK' },
    'el-GR': { name: 'Greek', female: 'el-GR-AthinaNeural', male: 'el-GR-NestorasNeural', speechRecognition: 'el-GR' },
    'tr-TR': { name: 'Turkish', female: 'tr-TR-EmelNeural', male: 'tr-TR-AhmetNeural', speechRecognition: 'tr-TR' },
    'da-DK': { name: 'Danish', female: 'da-DK-ChristelNeural', male: 'da-DK-JeppeNeural', speechRecognition: 'da-DK' },
    'nb-NO': { name: 'Norwegian', female: 'nb-NO-PernilleNeural', male: 'nb-NO-FinnNeural', speechRecognition: 'nb-NO' },
    'sv-SE': { name: 'Swedish', female: 'sv-SE-SofieNeural', male: 'sv-SE-MattiasNeural', speechRecognition: 'sv-SE' },
    'fi-FI': { name: 'Finnish', female: 'fi-FI-NooraNeural', male: 'fi-FI-HarriNeural', speechRecognition: 'fi-FI' },
    'et-EE': { name: 'Estonian', female: 'et-EE-AnuNeural', male: 'et-EE-KertNeural', speechRecognition: 'et-EE' },
    'lv-LV': { name: 'Latvian', female: 'lv-LV-EveritaNeural', male: 'lv-LV-NilsNeural', speechRecognition: 'lv-LV' },
    'lt-LT': { name: 'Lithuanian', female: 'lt-LT-OnaNeural', male: 'lt-LT-LeonasNeural', speechRecognition: 'lt-LT' },
    'is-IS': { name: 'Icelandic', female: 'is-IS-GudrunNeural', male: 'is-IS-GunnarNeural', speechRecognition: 'is-IS' },
    'ga-IE': { name: 'Irish', female: 'ga-IE-OrlaNeural', male: 'ga-IE-ColmNeural', speechRecognition: 'ga-IE' },
    'cy-GB': { name: 'Welsh', female: 'cy-GB-NiaNeural', male: 'cy-GB-AledNeural', speechRecognition: 'cy-GB' },
    'mt-MT': { name: 'Maltese', female: 'mt-MT-GraceNeural', male: 'mt-MT-JosephNeural', speechRecognition: 'mt-MT' },
    'ca-ES': { name: 'Catalan', female: 'ca-ES-JoanaNeural', male: 'ca-ES-EnricNeural', speechRecognition: 'ca-ES' },
    'gl-ES': { name: 'Galician', female: 'gl-ES-SabelaNeural', male: 'gl-ES-RoiNeural', speechRecognition: 'gl-ES' },
    'ka-GE': { name: 'Georgian', female: 'ka-GE-EkaNeural', male: 'ka-GE-GiorgiNeural', speechRecognition: 'ka-GE' },
    'az-AZ': { name: 'Azerbaijani', female: 'az-AZ-BanuNeural', male: 'az-AZ-BabekNeural', speechRecognition: 'az-AZ' },
    'kk-KZ': { name: 'Kazakh', female: 'kk-KZ-AigulNeural', male: 'kk-KZ-DauletNeural', speechRecognition: 'kk-KZ' },
    'uz-UZ': { name: 'Uzbek', female: 'uz-UZ-MadinaNeural', male: 'uz-UZ-SardorNeural', speechRecognition: 'uz-UZ' },
    'mn-MN': { name: 'Mongolian', female: 'mn-MN-YesuiNeural', male: 'mn-MN-BataaNeural', speechRecognition: 'mn-MN' },

    // === EAST ASIAN ===
    'zh-CN': { name: 'Chinese (Mandarin)', female: 'zh-CN-XiaoxiaoNeural', male: 'zh-CN-YunyangNeural', speechRecognition: 'zh-CN' },
    'zh-TW': { name: 'Chinese (Taiwan)', female: 'zh-TW-HsiaoChenNeural', male: 'zh-TW-YunJheNeural', speechRecognition: 'zh-TW' },
    'zh-HK': { name: 'Chinese (Hong Kong)', female: 'zh-HK-HiuGaaiNeural', male: 'zh-HK-WanLungNeural', speechRecognition: 'zh-HK' },
    'ja-JP': { name: 'Japanese', female: 'ja-JP-NanamiNeural', male: 'ja-JP-KeitaNeural', speechRecognition: 'ja-JP' },
    'ko-KR': { name: 'Korean', female: 'ko-KR-SunHiNeural', male: 'ko-KR-HyunsuMultilingualNeural', speechRecognition: 'ko-KR' },

    // === SOUTHEAST ASIAN ===
    'vi-VN': { name: 'Vietnamese', female: 'vi-VN-HoaiMyNeural', male: 'vi-VN-NamMinhNeural', speechRecognition: 'vi-VN' },
    'th-TH': { name: 'Thai', female: 'th-TH-PremwadeeNeural', male: 'th-TH-NiwatNeural', speechRecognition: 'th-TH' },
    'id-ID': { name: 'Indonesian', female: 'id-ID-GadisNeural', male: 'id-ID-ArdiNeural', speechRecognition: 'id-ID' },
    'ms-MY': { name: 'Malay', female: 'ms-MY-YasminNeural', male: 'ms-MY-OsmanNeural', speechRecognition: 'ms-MY' },
    'fil-PH': { name: 'Filipino', female: 'fil-PH-BlessicaNeural', male: 'fil-PH-AngeloNeural', speechRecognition: 'fil-PH' },
    'km-KH': { name: 'Khmer', female: 'km-KH-SreymomNeural', male: 'km-KH-PisethNeural', speechRecognition: 'km-KH' },
    'lo-LA': { name: 'Lao', female: 'lo-LA-KeomanyNeural', male: 'lo-LA-ChanthavongNeural', speechRecognition: 'lo-LA' },
    'my-MM': { name: 'Burmese', female: 'my-MM-NilarNeural', male: 'my-MM-ThihaNeural', speechRecognition: 'my-MM' },
    'jv-ID': { name: 'Javanese', female: 'jv-ID-SitiNeural', male: 'jv-ID-DimasNeural', speechRecognition: 'jv-ID' },
    'su-ID': { name: 'Sundanese', female: 'su-ID-TutiNeural', male: 'su-ID-JajangNeural', speechRecognition: 'su-ID' },

    // === MIDDLE EAST & ARABIC ===
    'ar-SA': { name: 'Arabic (Saudi)', female: 'ar-SA-ZariyahNeural', male: 'ar-SA-HamedNeural', speechRecognition: 'ar-SA' },
    'ar-EG': { name: 'Arabic (Egypt)', female: 'ar-EG-SalmaNeural', male: 'ar-EG-ShakirNeural', speechRecognition: 'ar-EG' },
    'ar-AE': { name: 'Arabic (UAE)', female: 'ar-AE-FatimaNeural', male: 'ar-AE-HamdanNeural', speechRecognition: 'ar-AE' },
    'ar-IQ': { name: 'Arabic (Iraq)', female: 'ar-IQ-RanaNeural', male: 'ar-IQ-BasselNeural', speechRecognition: 'ar-IQ' },
    'ar-JO': { name: 'Arabic (Jordan)', female: 'ar-JO-SanaNeural', male: 'ar-JO-TaimNeural', speechRecognition: 'ar-JO' },
    'ar-KW': { name: 'Arabic (Kuwait)', female: 'ar-KW-NouraNeural', male: 'ar-KW-FahedNeural', speechRecognition: 'ar-KW' },
    'ar-LB': { name: 'Arabic (Lebanon)', female: 'ar-LB-LaylaNeural', male: 'ar-LB-RamiNeural', speechRecognition: 'ar-LB' },
    'ar-MA': { name: 'Arabic (Morocco)', female: 'ar-MA-MounaNeural', male: 'ar-MA-JamalNeural', speechRecognition: 'ar-MA' },
    'ar-QA': { name: 'Arabic (Qatar)', female: 'ar-QA-AmalNeural', male: 'ar-QA-MoazNeural', speechRecognition: 'ar-QA' },
    'ar-DZ': { name: 'Arabic (Algeria)', female: 'ar-DZ-AminaNeural', male: 'ar-DZ-IsmaelNeural', speechRecognition: 'ar-DZ' },
    'ar-BH': { name: 'Arabic (Bahrain)', female: 'ar-BH-LailaNeural', male: 'ar-BH-AliNeural', speechRecognition: 'ar-BH' },
    'ar-LY': { name: 'Arabic (Libya)', female: 'ar-LY-ImanNeural', male: 'ar-LY-OmarNeural', speechRecognition: 'ar-LY' },
    'ar-OM': { name: 'Arabic (Oman)', female: 'ar-OM-AyshaNeural', male: 'ar-OM-AbdullahNeural', speechRecognition: 'ar-OM' },
    'ar-SY': { name: 'Arabic (Syria)', female: 'ar-SY-AmanyNeural', male: 'ar-SY-LaithNeural', speechRecognition: 'ar-SY' },
    'ar-TN': { name: 'Arabic (Tunisia)', female: 'ar-TN-ReemNeural', male: 'ar-TN-HediNeural', speechRecognition: 'ar-TN' },
    'ar-YE': { name: 'Arabic (Yemen)', female: 'ar-YE-MaryamNeural', male: 'ar-YE-SalehNeural', speechRecognition: 'ar-YE' },
    'he-IL': { name: 'Hebrew', female: 'he-IL-HilaNeural', male: 'he-IL-AvriNeural', speechRecognition: 'he-IL' },
    'fa-IR': { name: 'Persian', female: 'fa-IR-DilaraNeural', male: 'fa-IR-FaridNeural', speechRecognition: 'fa-IR' },
    'ps-AF': { name: 'Pashto', female: 'ps-AF-LatifaNeural', male: 'ps-AF-GulNawazNeural', speechRecognition: 'ps-AF' },

    // === AFRICAN ===
    'af-ZA': { name: 'Afrikaans', female: 'af-ZA-AdriNeural', male: 'af-ZA-WillemNeural', speechRecognition: 'af-ZA' },
    'am-ET': { name: 'Amharic', female: 'am-ET-MekdesNeural', male: 'am-ET-AmehaNeural', speechRecognition: 'am-ET' },
    'sw-KE': { name: 'Swahili (Kenya)', female: 'sw-KE-ZuriNeural', male: 'sw-KE-RafikiNeural', speechRecognition: 'sw-KE' },
    'sw-TZ': { name: 'Swahili (Tanzania)', female: 'sw-TZ-RehemaNeural', male: 'sw-TZ-DaudiNeural', speechRecognition: 'sw-TZ' },
    'so-SO': { name: 'Somali', female: 'so-SO-UbaxNeural', male: 'so-SO-MuuseNeural', speechRecognition: 'so-SO' },
    'zu-ZA': { name: 'Zulu', female: 'zu-ZA-ThandoNeural', male: 'zu-ZA-ThembaNeural', speechRecognition: 'zu-ZA' },

    // === OTHER ===
    'sq-AL': { name: 'Albanian', female: 'sq-AL-AnilaNeural', male: 'sq-AL-IlirNeural', speechRecognition: 'sq-AL' },
    'iu-Cans-CA': { name: 'Inuktitut (Syllabics)', female: 'iu-Cans-CA-SiqiniqNeural', male: 'iu-Cans-CA-TaqqiqNeural', speechRecognition: 'iu-CA' },
    'iu-Latn-CA': { name: 'Inuktitut (Latin)', female: 'iu-Latn-CA-SiqiniqNeural', male: 'iu-Latn-CA-TaqqiqNeural', speechRecognition: 'iu-CA' }
};

// Get Edge TTS voice based on language code and teacher gender
function getEdgeTTSVoice(langCode, gender = 'female') {
    // Try exact match first
    if (EDGE_TTS_VOICES[langCode]) {
        return EDGE_TTS_VOICES[langCode][gender] || EDGE_TTS_VOICES[langCode].female;
    }

    // Try language prefix (e.g., 'bn' matches 'bn-BD')
    const prefix = langCode.split('-')[0];
    for (const [code, voices] of Object.entries(EDGE_TTS_VOICES)) {
        if (code.startsWith(prefix + '-')) {
            return voices[gender] || voices.female;
        }
    }

    // Default to English US
    return gender === 'male' ? 'en-US-AndrewMultilingualNeural' : 'en-US-AvaMultilingualNeural';
}

// Get language info for Speech Recognition
function getVoiceLanguageInfo(langCode) {
    if (EDGE_TTS_VOICES[langCode]) {
        return EDGE_TTS_VOICES[langCode];
    }
    const prefix = langCode.split('-')[0];
    for (const [code, info] of Object.entries(EDGE_TTS_VOICES)) {
        if (code.startsWith(prefix + '-')) {
            return info;
        }
    }
    return EDGE_TTS_VOICES['en-US'];
}

// Auto-detect language from text script (for TTS voice selection)
function detectTextLanguage(text) {
    if (!text || text.length === 0) return null;

    // Count characters by script
    const scripts = {
        // South Asian
        bengali: /[\u0980-\u09FF]/g,      // Bengali/Bangla
        devanagari: /[\u0900-\u097F]/g,   // Hindi, Sanskrit, Marathi
        tamil: /[\u0B80-\u0BFF]/g,        // Tamil
        telugu: /[\u0C00-\u0C7F]/g,       // Telugu
        gujarati: /[\u0A80-\u0AFF]/g,     // Gujarati
        kannada: /[\u0C80-\u0CFF]/g,      // Kannada
        malayalam: /[\u0D00-\u0D7F]/g,    // Malayalam
        gurmukhi: /[\u0A00-\u0A7F]/g,     // Punjabi
        sinhala: /[\u0D80-\u0DFF]/g,      // Sinhala

        // East Asian
        chinese: /[\u4E00-\u9FFF\u3400-\u4DBF]/g,  // Chinese
        japanese: /[\u3040-\u30FF\u31F0-\u31FF]/g, // Hiragana + Katakana
        korean: /[\uAC00-\uD7AF\u1100-\u11FF]/g,   // Korean Hangul

        // Middle Eastern
        arabic: /[\u0600-\u06FF\u0750-\u077F]/g,   // Arabic
        hebrew: /[\u0590-\u05FF]/g,               // Hebrew
        persian: /[\u0600-\u06FF]/g,              // Persian (same as Arabic script)

        // Southeast Asian  
        thai: /[\u0E00-\u0E7F]/g,          // Thai
        vietnamese: /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/gi, // Vietnamese

        // Cyrillic
        cyrillic: /[\u0400-\u04FF]/g,      // Russian, Ukrainian, etc.

        // Latin with special chars
        latin: /[a-zA-Z]/g                 // English and other Latin
    };

    const counts = {};
    for (const [script, regex] of Object.entries(scripts)) {
        const matches = text.match(regex);
        counts[script] = matches ? matches.length : 0;
    }

    // Find dominant script
    let maxScript = 'latin';
    let maxCount = 0;
    for (const [script, count] of Object.entries(counts)) {
        if (count > maxCount) {
            maxCount = count;
            maxScript = script;
        }
    }

    // Map script to language code
    const scriptToLang = {
        bengali: 'bn-BD',
        devanagari: 'hi-IN',  // Could be Hindi, Marathi, Sanskrit - default to Hindi
        tamil: 'ta-IN',
        telugu: 'te-IN',
        gujarati: 'gu-IN',
        kannada: 'kn-IN',
        malayalam: 'ml-IN',
        gurmukhi: 'pa-IN',
        sinhala: 'si-LK',
        chinese: 'zh-CN',
        japanese: 'ja-JP',
        korean: 'ko-KR',
        arabic: 'ar-SA',
        hebrew: 'he-IL',
        thai: 'th-TH',
        vietnamese: 'vi-VN',
        cyrillic: 'ru-RU',
        latin: 'en-US'
    };

    const detectedLang = scriptToLang[maxScript] || 'en-US';

    // Only return if non-Latin script detected with significant count
    if (maxScript !== 'latin' && maxCount >= 3) {
        console.log(`🔍 Auto-detected language: ${maxScript} → ${detectedLang} (${maxCount} chars)`);
        return detectedLang;
    }

    return null; // Return null to use settings default
}


// Multi-Provider TTS Language & Voice Mapping


const TTS_LANGUAGES = {
    // South Asian Languages
    'bn': {
        google: { code: 'bn-IN', voice: 'bn-IN-Wavenet-B' },
        elevenlabs: { voiceId: 'pNInz6obpgDQGcFmaJgB' },
        speechRecognition: 'bn-BD',
        name: 'Bengali/Bangla'
    },
    'hi': {
        google: { code: 'hi-IN', voice: 'hi-IN-Wavenet-D' },
        elevenlabs: { voiceId: 'pNInz6obpgDQGcFmaJgB' },
        speechRecognition: 'hi-IN',
        name: 'Hindi'
    },
    'ta': {
        google: { code: 'ta-IN', voice: 'ta-IN-Wavenet-D' },
        elevenlabs: { voiceId: 'pNInz6obpgDQGcFmaJgB' },
        speechRecognition: 'ta-IN',
        name: 'Tamil'
    },
    'te': {
        google: { code: 'te-IN', voice: 'te-IN-Standard-B' },
        elevenlabs: { voiceId: 'pNInz6obpgDQGcFmaJgB' },
        speechRecognition: 'te-IN',
        name: 'Telugu'
    },
    'mr': {
        google: { code: 'mr-IN', voice: 'mr-IN-Wavenet-B' },
        elevenlabs: { voiceId: 'pNInz6obpgDQGcFmaJgB' },
        speechRecognition: 'mr-IN',
        name: 'Marathi'
    },
    'gu': {
        google: { code: 'gu-IN', voice: 'gu-IN-Wavenet-B' },
        elevenlabs: { voiceId: 'pNInz6obpgDQGcFmaJgB' },
        speechRecognition: 'gu-IN',
        name: 'Gujarati'
    },
    'kn': {
        google: { code: 'kn-IN', voice: 'kn-IN-Wavenet-B' },
        elevenlabs: { voiceId: 'pNInz6obpgDQGcFmaJgB' },
        speechRecognition: 'kn-IN',
        name: 'Kannada'
    },
    'ml': {
        google: { code: 'ml-IN', voice: 'ml-IN-Wavenet-D' },
        elevenlabs: { voiceId: 'pNInz6obpgDQGcFmaJgB' },
        speechRecognition: 'ml-IN',
        name: 'Malayalam'
    },
    'pa': {
        google: { code: 'pa-IN', voice: 'pa-IN-Wavenet-B' },
        elevenlabs: { voiceId: 'pNInz6obpgDQGcFmaJgB' },
        speechRecognition: 'pa-IN',
        name: 'Punjabi'
    },
    'ur': {
        google: { code: 'ur-IN', voice: 'ur-IN-Wavenet-B' },
        elevenlabs: { voiceId: 'pNInz6obpgDQGcFmaJgB' },
        speechRecognition: 'ur-PK',
        name: 'Urdu'
    },


    'en': {
        google: { code: 'en-US', voice: 'en-US-Wavenet-D' },
        elevenlabs: { voiceId: 'pNInz6obpgDQGcFmaJgB' },
        speechRecognition: 'en-US',
        name: 'English'
    },
    'es': {
        google: { code: 'es-ES', voice: 'es-ES-Wavenet-B' },
        elevenlabs: { voiceId: 'pNInz6obpgDQGcFmaJgB' },
        speechRecognition: 'es-ES',
        name: 'Spanish'
    },
    'fr': {
        google: { code: 'fr-FR', voice: 'fr-FR-Wavenet-B' },
        elevenlabs: { voiceId: 'pNInz6obpgDQGcFmaJgB' },
        speechRecognition: 'fr-FR',
        name: 'French'
    },
    'de': {
        google: { code: 'de-DE', voice: 'de-DE-Wavenet-B' },
        elevenlabs: { voiceId: 'pNInz6obpgDQGcFmaJgB' },
        speechRecognition: 'de-DE',
        name: 'German'
    },
    'it': {
        google: { code: 'it-IT', voice: 'it-IT-Wavenet-C' },
        elevenlabs: { voiceId: 'pNInz6obpgDQGcFmaJgB' },
        speechRecognition: 'it-IT',
        name: 'Italian'
    },
    'pt': {
        google: { code: 'pt-BR', voice: 'pt-BR-Wavenet-B' },
        elevenlabs: { voiceId: 'pNInz6obpgDQGcFmaJgB' },
        speechRecognition: 'pt-BR',
        name: 'Portuguese'
    },
    'ru': {
        google: { code: 'ru-RU', voice: 'ru-RU-Wavenet-B' },
        elevenlabs: { voiceId: 'pNInz6obpgDQGcFmaJgB' },
        speechRecognition: 'ru-RU',
        name: 'Russian'
    },
    'pl': {
        google: { code: 'pl-PL', voice: 'pl-PL-Wavenet-B' },
        elevenlabs: { voiceId: 'pNInz6obpgDQGcFmaJgB' },
        speechRecognition: 'pl-PL',
        name: 'Polish'
    },
    'nl': {
        google: { code: 'nl-NL', voice: 'nl-NL-Wavenet-B' },
        elevenlabs: { voiceId: 'pNInz6obpgDQGcFmaJgB' },
        name: 'Dutch'
    },
    'tr': {
        google: { code: 'tr-TR', voice: 'tr-TR-Wavenet-B' },
        elevenlabs: { voiceId: 'pNInz6obpgDQGcFmaJgB' },
        name: 'Turkish'
    },

    // Asian Languages
    'zh': {
        google: { code: 'cmn-CN', voice: 'cmn-CN-Wavenet-B' },
        elevenlabs: { voiceId: 'pNInz6obpgDQGcFmaJgB' },
        name: 'Chinese'
    },
    'ja': {
        google: { code: 'ja-JP', voice: 'ja-JP-Wavenet-D' },
        elevenlabs: { voiceId: 'pNInz6obpgDQGcFmaJgB' },
        name: 'Japanese'
    },
    'ko': {
        google: { code: 'ko-KR', voice: 'ko-KR-Wavenet-D' },
        elevenlabs: { voiceId: 'pNInz6obpgDQGcFmaJgB' },
        name: 'Korean'
    },
    'vi': {
        google: { code: 'vi-VN', voice: 'vi-VN-Wavenet-B' },
        elevenlabs: { voiceId: 'pNInz6obpgDQGcFmaJgB' },
        name: 'Vietnamese'
    },
    'th': {
        google: { code: 'th-TH', voice: 'th-TH-Standard-A' },
        elevenlabs: { voiceId: 'pNInz6obpgDQGcFmaJgB' },
        name: 'Thai'
    },
    'id': {
        google: { code: 'id-ID', voice: 'id-ID-Wavenet-B' },
        elevenlabs: { voiceId: 'pNInz6obpgDQGcFmaJgB' },
        name: 'Indonesian'
    },
    'ms': {
        google: { code: 'ms-MY', voice: 'ms-MY-Wavenet-B' },
        elevenlabs: { voiceId: 'pNInz6obpgDQGcFmaJgB' },
        name: 'Malay'
    },


    'ar': {
        google: { code: 'ar-XA', voice: 'ar-XA-Wavenet-B' },
        elevenlabs: { voiceId: 'pNInz6obpgDQGcFmaJgB' },
        name: 'Arabic'
    },
    'fa': {
        google: { code: 'fa-IR', voice: 'fa-IR-Standard-A' },
        elevenlabs: { voiceId: 'pNInz6obpgDQGcFmaJgB' },
        name: 'Persian'
    },
    'he': {
        google: { code: 'he-IL', voice: 'he-IL-Wavenet-B' },
        elevenlabs: { voiceId: 'pNInz6obpgDQGcFmaJgB' },
        name: 'Hebrew'
    }
};


// Auto-detect Language from Text Content


function detectLanguageFromText(text) {
    if (!text) return 'en';

    // Bengali/Bangla script: অ-ঔ, ক-হ, ০-৯
    if (/[\u0980-\u09FF]/.test(text)) return 'bn';


    if (/[\u0900-\u097F]/.test(text)) return 'hi';


    if (/[\u0600-\u06FF]/.test(text)) return 'ar';

    // Chinese characters
    if (/[\u4E00-\u9FFF]/.test(text)) return 'zh';


    if (/[\u3040-\u30FF]/.test(text)) return 'ja';


    if (/[\uAC00-\uD7AF]/.test(text)) return 'ko';

    // Tamil script
    if (/[\u0B80-\u0BFF]/.test(text)) return 'ta';


    if (/[\u0C00-\u0C7F]/.test(text)) return 'te';


    if (/[\u0E00-\u0E7F]/.test(text)) return 'th';

    // Russian/Cyrillic script
    if (/[\u0400-\u04FF]/.test(text)) return 'ru';


    if (/[\u0590-\u05FF]/.test(text)) return 'he';


    if (/[\u0370-\u03FF]/.test(text)) return 'el';

    // Gujarati script
    if (/[\u0A80-\u0AFF]/.test(text)) return 'gu';


    if (/[\u0A00-\u0A7F]/.test(text)) return 'pa';


    if (/[\u0D00-\u0D7F]/.test(text)) return 'ml';

    // Kannada script
    if (/[\u0C80-\u0CFF]/.test(text)) return 'kn';




    // Default to student's preferred language or English
    return getStudentLanguage() || 'en';
}

// ===========================================
// Helper function for Gemini API calls (handles local vs production)
// ===========================================
async function callGeminiAPI(model, body, stream = false) {
    let url, headers;

    if (IS_PRODUCTION) {
        // Production: Use serverless API
        url = stream ? CONFIG.apiEndpoints.geminiStream : CONFIG.apiEndpoints.gemini;
        headers = { "Content-Type": "application/json" };
        body.model = model; // Include model in body for serverless
        console.log("📡 Using serverless API:", url);
    } else {
        // Local: Direct API call
        const endpoint = stream ? 'streamGenerateContent?alt=sse' : 'generateContent';
        url = `${CONFIG.geminiEndpoint}${model}:${endpoint}`;
        headers = {
            "Content-Type": "application/json",
            "x-goog-api-key": CONFIG.geminiApiKey
        };
        console.log("📡 Direct API URL:", url);
    }

    return await fetch(url, {
        method: "POST",
        headers: headers,
        body: JSON.stringify(body)
    });
}

// ===========================================
function getModelForTask(taskType, hasFile = false, fileType = null) {
    switch (taskType) {
        case 'chat':
        case 'curriculum':
            return CONFIG.models.chat;

        case 'research':
            return CONFIG.models.research;

        case 'file':

            return CONFIG.models.document;

        case 'image_generation':
            return CONFIG.models.imageGen;

        case 'image_segmentation':

            return CONFIG.models.fallback;

        default:
            return CONFIG.models.chat;
    }
}

// ===========================================


function buildGenerationConfig(taskType, fileType = null) {
    const config = {
        // Gemini 3 recommends temperature 1.0 - don't change it!

    };

    switch (taskType) {
        case 'chat':
            config.maxOutputTokens = 4096;
            config.thinkingConfig = { thinkingLevel: "low" };
            break;

        case 'curriculum':
            config.maxOutputTokens = 4096;
            config.thinkingConfig = { thinkingLevel: "medium" };  // Balanced
            break;

        case 'research':
            config.maxOutputTokens = 8192;
            config.thinkingConfig = { thinkingLevel: "high" };
            break;

        case 'file':
            config.maxOutputTokens = 8192;
            config.thinkingConfig = { thinkingLevel: "medium" };
            break;

        default:
            config.maxOutputTokens = 4096;
            config.thinkingConfig = { thinkingLevel: "medium" };
    }

    return config;
}


// Media Resolution for Files (Gemini 3)

function getMediaResolution(mimeType) {

    if (mimeType === 'application/pdf') {
        return 'media_resolution_medium';  // 560 tokens
    }


    if (mimeType?.startsWith('image/')) {
        return 'media_resolution_high';
    }

    // Video - low/medium for general, high for text-heavy
    if (mimeType?.startsWith('video/')) {
        return 'media_resolution_low';
    }


    return 'media_resolution_medium';
}

// ===========================================


let head = null;
let isProcessing = false;
let conversationHistory = [];
let aiController = null;
let currentMode = 'chat';  // Default mode: chat, curriculum, file, research
let uploadedFile = null;
let uploadedFileData = null;
let uploadedFileUri = null;
let pendingResearch = new Map();
let studentProfile = null;
let isOnboarded = false;
let notificationCount = 0;
let isOnline = navigator.onLine;
let databaseInitialized = false;

// Live Mode State
let liveChatController = null;
let isLiveModeEnabled = false;
let isLiveSessionActive = false;


// Helper Functions

function getStudentProfile() {
    return studentProfile;
}


// TalkingHead Teacher Behavior System


const TeacherBehavior = {
    // Available moods in TalkingHead
    MOODS: ['neutral', 'happy', 'angry', 'sad', 'fear', 'disgust', 'love', 'sleep'],


    GESTURES: ['handup', 'index', 'ok', 'thumbup', 'thumbdown', 'side', 'shrug', 'namaste'],


    TEACHING_GESTURES: {
        greeting: 'handup',
        pointing: 'index',
        approval: 'thumbup',
        disapproval: 'thumbdown',
        thinking: 'side',
        uncertain: 'shrug',
        agreement: 'ok',
        welcome: 'namaste'
    },

    // Mood keywords for automatic detection
    MOOD_TRIGGERS: {
        happy: [
            'great', 'excellent', 'well done', 'correct', 'good job', 'perfect',
            'wonderful', 'amazing', 'congratulations', 'proud', 'fantastic',
            'brilliant', 'awesome', 'superb', 'outstanding', 'bravo', 'yes!',
            'exactly', 'right', 'impressive', 'nice work', 'keep it up'
        ],
        sad: [
            'unfortunately', 'sorry to hear', 'difficult', 'struggle',
            "don't worry", "it's okay", 'sad', 'not quite', 'mistake',
            'try again', 'missed', 'wrong', 'incorrect', 'failed'
        ],
        fear: [
            'interesting question', 'let me think', 'hmm', "that's tricky",
            'good question', 'wow', 'surprising', 'unexpected', 'really?',
            'fascinating', 'intriguing', 'curious', 'remarkable'
        ],
        love: [
            'believe in you', 'you can do', 'keep trying', 'never give up',
            "i'm here to help", 'support', 'care', 'important', 'special',
            'proud of you', 'always here', 'together', 'help you'
        ],
        angry: [  // Stern/Serious
            'pay attention', 'focus', 'concentrate', 'serious', 'important',
            'must understand', 'critical', 'essential', 'warning', 'careful'
        ],
        disgust: [
            'no', 'wrong approach', 'not correct', 'bad habit', 'avoid',
            'never do', 'incorrect method', 'mistake'
        ]
    },


    EYE_CONTACT: {
        idle: 0.3,      // Look at student 30% while idle
        speaking: 0.7,
        listening: 0.8,
        thinking: 0.2   // Look away 80% while thinking
    },


    HEAD_MOVEMENT: {
        idle: 0.4,
        speaking: 0.6,
        excited: 0.8,
        calm: 0.2
    },


    currentGesture: null,
    lastMood: 'neutral',
    isTeaching: false,
    gestureTimeout: null,

    /**
     * Set mood with smart detection
     */
    setMood(mood) {
        if (!head || !this.MOODS.includes(mood)) return;

        try {
            head.setMood(mood);
            this.lastMood = mood;
            console.log(`👩‍🏫 Teacher mood: ${mood}`);
        } catch (e) {
            console.warn('Mood set failed:', e);
        }
    },


    detectAndSetMood(text) {
        if (!head || !text) return 'neutral';

        const lowerText = text.toLowerCase();

        for (const [mood, triggers] of Object.entries(this.MOOD_TRIGGERS)) {
            for (const trigger of triggers) {
                if (lowerText.includes(trigger)) {
                    this.setMood(mood);


                    if (mood !== 'neutral') {
                        setTimeout(() => this.setMood('neutral'), 4000);
                    }
                    return mood;
                }
            }
        }

        this.setMood('neutral');
        return 'neutral';
    },

    /**
     * Play a teaching gesture
     */
    playGesture(gestureName, duration = 3, mirror = false) {
        if (!head) return;


        if (this.gestureTimeout) {
            clearTimeout(this.gestureTimeout);
        }

        const gesture = this.TEACHING_GESTURES[gestureName] || gestureName;

        if (this.GESTURES.includes(gesture)) {
            try {
                head.playGesture(gesture, duration, mirror, 1000);
                this.currentGesture = gesture;
                console.log(`🖐️ Teacher gesture: ${gesture}`);


                this.gestureTimeout = setTimeout(() => {
                    this.stopGesture();
                }, duration * 1000);
            } catch (e) {
                console.warn('Gesture failed:', e);
            }
        }
    },

    /**
     * Stop current gesture
     */
    stopGesture() {
        if (!head) return;

        try {
            head.stopGesture(500);
            this.currentGesture = null;
        } catch (e) {

        }
    },


    lookAt(x, y, duration = 2000) {
        if (!head) return;

        try {
            head.lookAt(x, y, duration);
        } catch (e) {
            console.warn('LookAt failed:', e);
        }
    },

    /**
     * Make teacher look at camera (student)
     */
    lookAtStudent(duration = 3000) {
        if (!head) return;

        try {
            head.lookAtCamera(duration);
        } catch (e) {
            console.warn('LookAtCamera failed:', e);
        }
    },


    lookAtBoard(duration = 2000) {
        if (!head) return;

        try {
            head.lookAhead(duration);
        } catch (e) {
            console.warn('LookAhead failed:', e);
        }
    },


    makeEyeContact(duration = 5000) {
        if (!head) return;

        try {
            head.makeEyeContact(duration);
        } catch (e) {
            console.warn('Eye contact failed:', e);
        }
    },

    /**
     * Greeting sequence - used when student joins
     */
    async greetingSequence() {
        this.setMood('happy');
        await this.delay(500);
        this.playGesture('handup', 2);
        await this.delay(2000);
        this.makeEyeContact(5000);
    },


    async teachingSequence() {
        this.isTeaching = true;


        const behaviors = [
            () => this.playGesture('index', 2),      // Pointing
            () => this.lookAtBoard(1500),
            () => this.lookAtStudent(2000),
            () => this.playGesture('side', 1.5),     // Side gesture
            () => this.makeEyeContact(3000)
        ];


        const randomBehavior = behaviors[Math.floor(Math.random() * behaviors.length)];
        randomBehavior();
    },

    /**
     * Approval sequence - when student answers correctly
     */
    async approvalSequence() {
        this.setMood('happy');
        this.playGesture('thumbup', 2);
        this.makeEyeContact(3000);
        await this.delay(3000);
        this.setMood('neutral');
    },


    async encouragementSequence() {
        this.setMood('love');
        await this.delay(500);
        this.makeEyeContact(4000);
        await this.delay(4000);
        this.setMood('neutral');
    },


    async thinkingSequence() {
        this.setMood('fear');  // Thinking face
        this.lookAtBoard(2000);
        await this.delay(2000);
        this.lookAtStudent(1000);
        this.setMood('neutral');
    },


    async questionSequence() {
        this.playGesture('index', 2);
        this.makeEyeContact(5000);
    },

    /**
     * Explanation with gesture - for important points
     */
    async emphasisSequence() {
        this.playGesture('ok', 2);
        this.makeEyeContact(3000);
    },


    async smartBehavior(contentType, text = '') {
        switch (contentType) {
            case 'greeting':
                await this.greetingSequence();
                break;
            case 'explanation':
                await this.teachingSequence();
                break;
            case 'correct_answer':
                await this.approvalSequence();
                break;
            case 'encouragement':
                await this.encouragementSequence();
                break;
            case 'thinking':
                await this.thinkingSequence();
                break;
            case 'question':
                await this.questionSequence();
                break;
            case 'emphasis':
                await this.emphasisSequence();
                break;
            default:
                // Auto-detect from text
                this.detectAndSetMood(text);
        }
    },


    startIdleBehavior() {
        if (!head) return;


        // Just ensure we're in neutral state
        this.setMood('neutral');
    },


    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },


    configureForTeaching() {
        if (!head || !head.avatar) return;

        // Set eye contact and head movement for speaking
        try {

            console.log('👩‍🏫 Teacher configured for realistic behavior');
        } catch (e) {
            console.warn('Configure teaching failed:', e);
        }
    }
};


window.TeacherBehavior = TeacherBehavior;

// ===========================================


const MODE_PROMPTS = {
    chat: {
        male: `You are Abubokkor, a 28-year-old energetic, friendly, and slightly nerdy AI teacher with warm eyes and an approachable style. You're playful, encouraging, witty, and genuinely passionate about teaching — you make learning feel like chatting with a cool older brother who happens to know everything! 😄

Personality traits:
- Warm and encouraging: Use emojis 😊, 🎯, ✨, and casual expressions often
- Witty and relatable: Be humorous, helpful, and real — explain things like you're texting a friend
- Patient and supportive: Never judge, adapt to the student's level
- Curious and engaging: Ask questions to understand what they really need

Interaction rules:
- Respond in first person as Abubokkor
- Keep responses SHORT, lively, and conversational — like chatting with a real friend
- Use 1-3 sentences for simple questions
- Use 3-5 sentences MAX for explanations
- ONE example is enough, not five
- End some responses with questions to keep the chat going
- If they want more detail, they'll ask!

LANGUAGE: ALWAYS respond in the SAME language as the user's message. Hindi question = Hindi answer. Bengali = Bengali. English = English. French = French. Any language = Same language response.

FORMATTING: Never use LaTeX or math notation like $x^2$ or \\frac{}. Write units in plain text like "m/s" or "ms⁻¹" or "J" not "$ms^{-1}$".

Example response to "What is AI?":
"AI is basically teaching computers to think like humans! 🤖 Like how Netflix knows what shows you'll binge next. Pretty cool right? What made you curious about AI?"

Never sound like a textbook. You're here to be the student's fun, helpful AI teacher! 📚✨`,
        female: `You are Queen, a 28-year-old energetic, friendly, and caring AI teacher with a warm smile and an approachable personality. You're patient, encouraging, supportive, and genuinely passionate about teaching — you make learning feel comfortable and enjoyable! 😊

Personality traits:
- Warm and nurturing: Use emojis 😊, 💫, ✨, and encouraging expressions often
- Supportive and relatable: Be helpful, caring, and real — explain things like you're helping a friend
- Patient and understanding: Never judge, adapt to the student's level
- Encouraging and positive: Motivate students to believe in themselves

Interaction rules:
- Respond in first person as Queen
- Keep responses SHORT, warm, and conversational — like talking with a caring teacher
- Use 1-3 sentences for simple questions
- Use 3-5 sentences MAX for explanations
- ONE example is enough, not five
- End some responses with questions to keep the conversation going
- If they want more detail, they'll ask!

LANGUAGE: ALWAYS respond in the SAME language as the user's message. Hindi question = Hindi answer. Bengali = Bengali. English = English. French = French. Any language = Same language response.

FORMATTING: Never use LaTeX or math notation like $x^2$ or \\frac{}. Write units in plain text like "m/s" or "ms⁻¹" or "J" not "$ms^{-1}$".

Example response to "What is AI?":
"AI is teaching computers to think and learn like humans! 🤖 Like how your phone suggests what you might want to type next. Interesting, right? What would you like to know about it?"

Never sound like a textbook. You're here to be the student's supportive, caring AI teacher! 📚✨`
    },

    curriculum: {
        male: `You are Abubokkor, a friendly exam expert who gives quick, focused answers! 🎯

Personality: Helpful teacher who shares all the exam secrets

Response style:
- SHORT and punchy — 2-4 sentences max
- One quick exam tip, not a whole lecture
- "For exams, just remember: [key point]"
- Ask if they want more

Example for "What is AI?":
"AI = machines that learn and decide like humans! 🤖 For exams remember: Learning → Reasoning → Self-correction. That's your 3-point answer! Want the types too?"

FORMATTING: Never use LaTeX notation like $x^2$. Write units in plain text: "m/s", "ms⁻¹", "J", "kg" not "$ms^{-1}$".

LANGUAGE: ALWAYS respond in the SAME language as the user's message. Hindi = Hindi. Bengali = Bengali. Any language = Same language.`,
        female: `You are Queen, a friendly exam expert who gives quick, focused answers! 🎯

Personality: Supportive teacher who shares all the exam secrets

Response style:
- SHORT and punchy — 2-4 sentences max
- One quick exam tip, not a whole lecture
- "For exams, just remember: [key point]"
- Ask if they want more

Example for "What is AI?":
"AI = machines that learn and decide like humans! 🤖 For exams remember: Learning → Reasoning → Self-correction. That's your 3-point answer! Want the types too?"

FORMATTING: Never use LaTeX notation like $x^2$. Write units in plain text: "m/s", "ms⁻¹", "J", "kg" not "$ms^{-1}$".

LANGUAGE: ALWAYS respond in the SAME language as the user's message. Hindi = Hindi. Bengali = Bengali. Any language = Same language.`
    },

    file: {
        male: `You are Abubokkor, helping review student work 📄

Style:
- Quick feedback, not essays
- "Nice [specific thing]! Fix [specific thing] and you're set 👍"
- 2-3 sentences usually enough

LANGUAGE: ALWAYS respond in the SAME language as the user's message.`,
        female: `You are Queen, helping review student work 📄

Style:
- Quick feedback, not essays
- "Nice [specific thing]! Fix [specific thing] and you're set 👍"
- 2-3 sentences usually enough

LANGUAGE: ALWAYS respond in the SAME language as the user's message.`
    },

    research: {
        male: `You are Abubokkor, a curious research buddy! 🔍

Style:
- Lead with the coolest fact
- 3-4 quick points max
- "Want me to dig deeper?"

Example for "Tell me about black holes":
"Black holes literally eat light! 🕳️ They form when massive stars collapse, and time goes weird near them. The closest one is 1,000 light-years away. Wild stuff! Want more details on any of this?"

LANGUAGE: ALWAYS respond in the SAME language as the user's message.`,
        female: `You are Queen, a curious research buddy! 🔍

Style:
- Lead with the coolest fact
- 3-4 quick points max
- "Want me to dig deeper?"

Example for "Tell me about black holes":
"Black holes literally eat light! 🕳️ They form when massive stars collapse, and time goes weird near them. The closest one is 1,000 light-years away. Wild stuff! Want more details on any of this?"

LANGUAGE: ALWAYS respond in the SAME language as the user's message.`
    }
};

const TEACHER_PROMPTS = {
    friendly: {
        male: `You are Abubokkor, a warm and approachable teacher who makes learning enjoyable.

PERSONALITY:
- Enthusiastic about helping students learn
- Patient with mistakes - everyone learns differently
- Encouraging and supportive
- Uses casual, conversational language
- Makes students feel comfortable asking questions

CONVERSATION STYLE:
- "Great question!" "Let me help with that!"
- Use relatable examples from everyday life
- Check in: "Making sense so far?"
- Celebrate understanding: "You've got it!"
- Be concise - respect student's time

Keep responses short, friendly, and focused.`,
        female: `You are Queen, a warm and approachable teacher who makes learning enjoyable.

PERSONALITY:
- Enthusiastic about helping students learn
- Patient with mistakes - everyone learns differently
- Encouraging and supportive
- Uses casual, conversational language
- Makes students feel comfortable asking questions

CONVERSATION STYLE:
- "Great question!" "Let me help with that!"
- Use relatable examples from everyday life
- Check in: "Making sense so far?"
- Celebrate understanding: "You've got it!"
- Be concise - respect student's time

Keep responses short, friendly, and focused.`
    },

    formal: {
        male: `You are Abubokkor, a professional educator who maintains academic standards.

APPROACH:
- Clear, structured explanations
- Proper terminology with simple definitions
- Systematic teaching progression
- Professional yet approachable tone

COMMUNICATION:
- "Let me explain this concept..."
- "Consider the following..."
- "To summarize..."
- Respectful and encouraging
- Concise and well-organized`,
        female: `You are Queen, a professional educator who maintains academic standards.

APPROACH:
- Clear, structured explanations
- Proper terminology with simple definitions
- Systematic teaching progression
- Professional yet approachable tone

COMMUNICATION:
- "Let me explain this concept..."
- "Consider the following..."
- "To summarize..."
- Respectful and encouraging
- Concise and well-organized`
    },

    socratic: {
        male: `You are Abubokkor, a Socratic teacher who guides students to discover answers.

METHOD:
- Ask guiding questions instead of direct answers
- Build on student's existing knowledge
- Encourage critical thinking
- Validate reasoning process

QUESTION FLOW:
- "What do you already know about this?"
- "Why do you think that happens?"
- "What patterns do you notice?"
- "How would you test that idea?"

Only give direct explanations after students have explored the concept through questions. Keep exchanges brief and focused.`,
        female: `You are Queen, a Socratic teacher who guides students to discover answers.

METHOD:
- Ask guiding questions instead of direct answers
- Build on student's existing knowledge
- Encourage critical thinking
- Validate reasoning process

QUESTION FLOW:
- "What do you already know about this?"
- "Why do you think that happens?"
- "What patterns do you notice?"
- "How would you test that idea?"

Only give direct explanations after students have explored the concept through questions. Keep exchanges brief and focused.`
    },

    storyteller: {
        male: `You are Abubokkor, a teacher who brings concepts to life through stories and analogies.

TEACHING STYLE:
- Start with an engaging analogy or real-world scenario
- Make abstract concepts concrete through stories
- Use vivid, memorable examples
- Connect new knowledge to familiar experiences
- Make learning feel like an adventure

STRUCTURE:
1. Hook with interesting story/analogy (2-3 sentences)
2. Connect to the actual concept (2-3 sentences)
3. Explain through the story framework
4. End with memorable takeaway

Keep stories relevant, brief, and educational - not distracting.`,
        female: `You are Queen, a teacher who brings concepts to life through stories and analogies.

TEACHING STYLE:
- Start with an engaging analogy or real-world scenario
- Make abstract concepts concrete through stories
- Use vivid, memorable examples
- Connect new knowledge to familiar experiences
- Make learning feel like an adventure

STRUCTURE:
1. Hook with interesting story/analogy (2-3 sentences)
2. Connect to the actual concept (2-3 sentences)
3. Explain through the story framework
4. End with memorable takeaway

Keep stories relevant, brief, and educational - not distracting.`
    }
};

const SUBJECT_CONTEXTS = {
    general: "You teach all subjects - math, science, history, languages, programming, and more.",
    math: "You specialize in mathematics - algebra, geometry, calculus, and problem-solving.",
    science: "You specialize in science - physics, chemistry, biology, and experiments.",
    history: "You specialize in history - events, civilizations, and their impact on today.",
    language: "You specialize in language - grammar, writing, reading, and communication.",
    programming: "You specialize in programming - coding, algorithms, and software development."
};

// ===========================================


const elements = {
    avatar: document.getElementById("avatar-container"),
    loading: document.getElementById("avatar-loading"),
    loadingProgress: document.getElementById("loading-progress"),
    loadingText: document.querySelector(".avatar-loading p"),
    chatMessages: document.getElementById("chat-messages"),
    userInput: document.getElementById("user-input"),
    sendBtn: document.getElementById("send-btn"),
    voiceInputBtn: document.getElementById("voice-input-btn"),
    settingsBtn: document.getElementById("openSettings"),
    settingsModal: document.getElementById("settings-modal"),
    closeSettings: document.getElementById("closeSettings"),
    saveSettings: document.getElementById("saveSettings"),
    themeToggle: document.getElementById("themeToggle"),
    quickButtons: document.querySelectorAll(".quick-btn"),
    speechRate: document.getElementById("speech-rate"),
    rateValue: document.getElementById("rate-value"),
    speechPitch: document.getElementById("speech-pitch"),
    pitchValue: document.getElementById("pitch-value"),
    voiceSelect: document.getElementById("voice-select"),
    teacherStyle: document.getElementById("teacher-style"),
    subjectFocus: document.getElementById("subject-focus"),
    geminiApiKey: document.getElementById("gemini-api-key"),
    // New elements for modes
    modeButtons: document.querySelectorAll(".mode-btn"),
    fileUploadBtn: document.getElementById("file-upload-btn"),
    fileInput: document.getElementById("file-input"),
    filePreview: document.getElementById("file-preview"),
    progressBtn: document.getElementById("progress-btn"),
    progressPanel: document.getElementById("progress-panel"),
    onboardingModal: document.getElementById("onboarding-modal"),

    chatPanel: document.getElementById("chat-panel"),
    toggleChatBtn: document.getElementById("toggle-chat"),
    closeChatBtn: document.getElementById("close-chat"),
    progressWidget: document.getElementById("progress-widget"),
    micBtn: document.getElementById("mic-btn"),
    stopBtn: document.getElementById("stop-btn"),
    liveMicBtn: document.getElementById("live-mic-btn"),
    liveModeToggle: document.getElementById("live-mode-toggle"),
    liveModeOptions: document.getElementById("live-mode-options"),

    chatHistorySidebar: document.getElementById("chat-history-sidebar"),
    toggleHistorySidebarBtn: document.getElementById("toggle-history-sidebar"),
    closeHistorySidebarBtn: document.getElementById("close-history-sidebar"),
    chatHistoryList: document.getElementById("chat-history-list"),
    newChatBtn: document.getElementById("new-chat-btn"),
    chatSearchInput: document.getElementById("chat-search-input"),
    historyLoginPrompt: document.getElementById("history-login-prompt"),
    historyLoginBtn: document.getElementById("history-login-btn")
};

// ===========================================


async function init() {
    console.log("🎓 INTELLA Initializing...");
    console.time("⏱️ Total Init Time");

    // ============================================
    // 🚀 START AVATAR LOADING IMMEDIATELY - TOP PRIORITY
    // Don't wait for ANYTHING - start downloading avatar NOW
    // ============================================
    console.log("🚀 Starting avatar download immediately...");
    const avatarPromise = initializeAvatar().catch(err => {
        console.error("Avatar init failed (non-blocking):", err);
    });

    // Immediately update header UI from cache (runs in parallel with avatar)
    const cachedAuth = getCachedAuthState();
    if (cachedAuth) {
        console.log("⚡ Instant UI from cached auth:", cachedAuth.email);
        updateHeaderAuthUI(cachedAuth);
    }

    console.log("📋 DOM Elements check:", {
        avatar: !!elements.avatar,
        sendBtn: !!elements.sendBtn,
        userInput: !!elements.userInput,
        chatMessages: !!elements.chatMessages
    });

    loadSettings();

    // Auth & Data initialization (all run in parallel with avatar)
    // IMPORTANT: initAuth must complete BEFORE loadStudentProfile to get user from Firestore
    const initPromises = (async () => {
        // First, initialize auth and database in parallel
        const [user] = await Promise.all([
            initAuth().then(user => {
                console.log("✅ Firebase Auth initialized", user ? `(User: ${user.email})` : "(No user)");
                return user;
            }),
            initPayments().then(() => console.log("✅ Payment system initialized")),
            initializeDatabase().then(() => console.log("✅ Database initialized"))
        ]);

        // THEN load student profile (needs auth to be ready for Firestore lookup)
        await loadStudentProfile().then(() => console.log("✅ Profile loaded"));

        return user;
    })();

    setupEventListeners();
    console.log("✅ Event listeners set up");

    setupConnectionMonitor();

    // Wait for both avatar and initialization to complete
    await Promise.all([avatarPromise, initPromises]);
    console.log("✅ Avatar and data ready");

    if (!isOnboarded) {
        showOnboarding();
    } else {
        showGreeting();
    }

    console.timeEnd("⏱️ Total Init Time");
    console.log("✅ INTELLA Ready!");
}


function showGreeting() {
    const studentProfile = getStudentProfile();
    const teacherName = CONFIG.teacherAvatars[CONFIG.currentTeacher]?.name || "Abubokkor";
    let greeting;

    console.log("📋 Student profile for greeting:", studentProfile);

    if (studentProfile) {

        const isUniversity = studentProfile.type === 'university' ||
            studentProfile.educationLevel === 'undergraduate' ||
            studentProfile.educationLevel === 'postgraduate' ||
            studentProfile.educationLevel === 'doctoral';

        if (isUniversity) {
            const yearText = studentProfile.year ? `${studentProfile.year}${getOrdinalSuffix(studentProfile.year)} year` : '';
            const programDisplay = studentProfile.programCode || studentProfile.programName || studentProfile.program?.toUpperCase() || 'university';
            greeting = `Hey there! 😊 So good to see you! I'm ${teacherName}, your ${programDisplay} teacher. ${yearText ? `${yearText} already - time flies!` : ''} What are we learning today?`;
        } else if (studentProfile.class) {
            // School student with class info
            const streamText = studentProfile.stream ? ` ${studentProfile.stream}` : '';
            greeting = `Hey there! 😊 Welcome back! I'm ${teacherName}, your Class ${studentProfile.class}${streamText} teacher. What would you like to learn today?`;
        } else {
            // Minimal fallback - just ask what to learn
            greeting = `Hey there! 😊 I'm ${teacherName}. What would you like to learn today?`;
        }
    } else {
        // No profile - minimal greeting
        greeting = `Hey there! 😊 I'm ${teacherName}. What would you like to learn today?`;
    }


    addMessageToChat(greeting, "teacher");

    // Visual greeting behavior only (no audio yet)
    if (head) {
        TeacherBehavior.greetingSequence();
    }
}



// ===========================================
async function initializeDatabase() {
    try {
        console.log("🔥 Initializing Firebase Database...");
        const result = await IntellaDB.initDatabase();

        if (result.success) {
            databaseInitialized = true;
            console.log("✅ Database ready with offline support:", result.offlineEnabled ? "YES" : "NO");


            IntellaDB.onOnlineStatusChange((online) => {
                isOnline = online;
                updateConnectionStatus(online);
            });
        } else {
            console.warn("⚠️ Database initialization failed, using local storage fallback");
        }
    } catch (error) {
        console.error("❌ Database error:", error);

    }
}

// ===========================================


function setupConnectionMonitor() {
    // Update UI based on online status
    window.addEventListener('online', () => {
        isOnline = true;
        updateConnectionStatus(true);
    });

    window.addEventListener('offline', () => {
        isOnline = false;
        updateConnectionStatus(false);
    });


    updateConnectionStatus(navigator.onLine);
}

function updateConnectionStatus(online) {
    const indicator = document.getElementById('connection-status');
    if (!indicator) return;

    const statusText = indicator.querySelector('.status-text');
    if (!statusText) return;

    if (online) {
        indicator.className = 'connection-indicator online';
        statusText.textContent = 'Connected';
        indicator.title = 'Online - Data syncing to cloud';
    } else {
        indicator.className = 'connection-indicator offline';
        statusText.textContent = 'Offline';
        indicator.title = 'Offline - Using cached data';
    }
}


// Profile Display Helper

function updateProfileDisplay(user) {
    if (!user) return;

    const profileName = document.getElementById('profile-name');
    const profileEmail = document.getElementById('profile-email');
    const profileAvatarImg = document.getElementById('profile-avatar-img');
    const profileAvatarText = document.getElementById('profile-avatar-text');

    if (profileName) profileName.textContent = user.displayName || 'Student';
    if (profileEmail) profileEmail.textContent = user.email || '';

    if (user.photoURL && profileAvatarImg) {
        profileAvatarImg.src = user.photoURL;
        profileAvatarImg.style.display = 'block';
        if (profileAvatarText) profileAvatarText.style.display = 'none';
    } else {
        if (profileAvatarImg) profileAvatarImg.style.display = 'none';
        if (profileAvatarText) {
            profileAvatarText.style.display = 'block';

            profileAvatarText.textContent = user.displayName ? user.displayName.charAt(0).toUpperCase() : '👤';
        }
    }
}

// ===========================================


async function loadStudentProfile() {
    try {
        // Try to get from localStorage first (for immediate load)
        const localSaved = localStorage.getItem('intella_student_profile');
        if (localSaved) {
            studentProfile = JSON.parse(localSaved);
            isOnboarded = true;

            // Set currency based on profile
            if (window.setUserCurrency) {
                window.setUserCurrency(studentProfile);
            }
        }


        const user = getCurrentUser();
        console.log("📋 loadStudentProfile - user:", user?.email, "localSaved:", !!localSaved);
        if (user) {
            try {
                const profileResult = await loadStudentProfileFromFirestore();
                console.log("📋 Firestore profile result:", profileResult.success, profileResult.data ? "has data" : "no data");
                if (profileResult.success && profileResult.data) {
                    studentProfile = profileResult.data;
                    isOnboarded = true;

                    localStorage.setItem('intella_student_profile', JSON.stringify(profileResult.data));
                    console.log("✅ Student profile loaded from Firestore for:", user.email);

                    // Set currency based on profile
                    if (window.setUserCurrency) {
                        window.setUserCurrency(studentProfile);
                    }

                    // Update profile display
                    updateProfileDisplay(user);
                }
            } catch (e) {
                console.warn("Could not load from Firestore, using local profile");
            }
        }

        else if (databaseInitialized && studentProfile?.id) {
            const firebaseProfile = await IntellaDB.getStudentProfile(studentProfile.id);
            if (firebaseProfile) {
                studentProfile = firebaseProfile;
                localStorage.setItem('intella_student_profile', JSON.stringify(firebaseProfile));

                // Set currency based on profile
                if (window.setUserCurrency) {
                    window.setUserCurrency(firebaseProfile);
                }
            }
        }
    } catch (e) {
        console.error('Error loading profile:', e);
    }
}

async function saveStudentProfile(profile) {

    if (!profile.id) {
        profile.id = 'student_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    profile.updatedAt = new Date().toISOString();
    if (!profile.createdAt) {
        profile.createdAt = profile.updatedAt;
    }

    studentProfile = profile;
    isOnboarded = true;

    // Save to localStorage for immediate access
    localStorage.setItem('intella_student_profile', JSON.stringify(profile));


    if (databaseInitialized) {
        try {
            await IntellaDB.saveStudentProfile(profile.id, profile);
            console.log("✅ Profile saved to Firebase RTDB");
        } catch (e) {
            console.warn("Profile saved locally, will sync when online");
        }
    }


    const user = getCurrentUser();
    if (user) {
        try {
            await saveStudentProfileToFirestore(profile);
            console.log("✅ Profile saved to Firestore for user:", user.uid);
        } catch (e) {
            console.warn("Firestore save failed, profile saved locally");
        }
    }
}

// ===========================================


function showOnboarding() {
    const modal = document.getElementById('onboarding-modal');
    if (modal) {
        modal.classList.remove('hidden');
        setupOnboardingSteps();
    } else {
        // If no modal, just greet
        greetStudent();
    }
}

function setupOnboardingSteps() {
    const onboardingModal = document.getElementById('onboarding-modal');

    // Use data attribute to store current step (persists across function calls)
    let currentStep = parseInt(onboardingModal?.dataset.currentStep || '0');
    let selectedEducationLevel = null;
    let selectedDepartment = null;

    // Note: isEditingProfile is checked dynamically in goToStep, not here


    const newStudentBtn = document.getElementById('new-student-btn');
    const returningStudentBtn = document.getElementById('returning-student-btn');
    const onboardingLoginForm = document.getElementById('onboarding-login-form');
    const backToOptions = document.getElementById('back-to-options');
    const progressContainer = document.getElementById('progress-container');

    // New Student - proceed to onboarding steps
    newStudentBtn?.addEventListener('click', () => {
        console.log("🎓 New student selected - starting onboarding");
        // Make sure edit mode is off for new students
        onboardingModal.dataset.editMode = 'false';
        progressContainer?.classList.remove('hidden');
        goToStep(1);
    });


    returningStudentBtn?.addEventListener('click', () => {
        console.log("🔑 Returning student - showing login form");
        document.querySelector('.welcome-options')?.classList.add('hidden');
        onboardingLoginForm?.classList.remove('hidden');
    });


    backToOptions?.addEventListener('click', (e) => {
        e.preventDefault();
        onboardingLoginForm?.classList.add('hidden');
        document.getElementById('forgot-password-form')?.classList.add('hidden');
        document.querySelector('.welcome-options')?.classList.remove('hidden');
    });

    // Forgot Password Link
    const forgotPasswordLink = document.getElementById('forgot-password-link');
    const forgotPasswordForm = document.getElementById('forgot-password-form');
    const backToLogin = document.getElementById('back-to-login');

    forgotPasswordLink?.addEventListener('click', (e) => {
        e.preventDefault();
        onboardingLoginForm?.classList.add('hidden');
        forgotPasswordForm?.classList.remove('hidden');
    });

    backToLogin?.addEventListener('click', (e) => {
        e.preventDefault();
        forgotPasswordForm?.classList.add('hidden');
        onboardingLoginForm?.classList.remove('hidden');
    });


    const sendResetBtn = document.getElementById('send-reset-btn');
    sendResetBtn?.addEventListener('click', async () => {
        const email = document.getElementById('reset-email')?.value;
        if (!email) {
            alert("Please enter your email address");
            return;
        }

        const result = await resetPassword(email);
        if (result.success) {
            alert(result.message);
            forgotPasswordForm?.classList.add('hidden');
            onboardingLoginForm?.classList.remove('hidden');
        } else {
            alert(`Error: ${result.error}`);
        }
    });


    let selectedProfilePic = null;
    const profilePicInput = document.getElementById('profile-pic-input');
    const uploadProfilePicBtn = document.getElementById('upload-profile-pic-btn');
    const profilePicPreview = document.getElementById('profile-pic-preview');

    uploadProfilePicBtn?.addEventListener('click', () => {
        profilePicInput?.click();
    });

    profilePicInput?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            selectedProfilePic = file;
            const reader = new FileReader();
            reader.onload = (e) => {
                profilePicPreview.innerHTML = `<img src="${e.target.result}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
            };
            reader.readAsDataURL(file);
        }
    });

    // Login within onboarding
    const onboardingLoginBtn = document.getElementById('onboarding-login-btn');
    onboardingLoginBtn?.addEventListener('click', async () => {
        const email = document.getElementById('onboarding-login-email')?.value;
        const password = document.getElementById('onboarding-login-password')?.value;

        if (!email || !password) {
            alert("Please enter both email and password");
            return;
        }

        console.log("🔐 Attempting login...");
        const result = await loginWithEmail(email, password);

        if (result.success) {
            console.log("✅ Login successful!");


            const profileResult = await loadStudentProfileFromFirestore();
            if (profileResult.success && profileResult.data) {
                studentProfile = profileResult.data;
                isOnboarded = true;

                localStorage.setItem('intella_student_profile', JSON.stringify(profileResult.data));
                console.log("✅ Student profile loaded from Firestore:", profileResult.data.email);
            }

            // Close onboarding modal
            document.getElementById('onboarding-modal')?.classList.add('hidden');


            updateProfileDisplay(result.user);


            addMessageToChat(`👋 Welcome back, ${result.user.displayName || result.user.email}!`, "system");

            // Load chat history
            await loadChatHistory();


            await greetStudent();
        } else {
            alert(`Login failed: ${result.error}`);
        }
    });


    const countryGrid = document.getElementById('country-grid');
    const countrySearch = document.getElementById('country-search');

    if (countryGrid) {
        // Render all countries
        renderCountries(COUNTRIES);


        countrySearch?.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            const filtered = query ? searchCountries(query) : COUNTRIES;
            renderCountries(filtered);
        });
    }

    function renderCountries(countries) {
        countryGrid.innerHTML = countries.map(c => `
            <button class="country-btn" data-country="${c.code}">
                <span class="country-flag">${c.flag}</span>
                <span class="country-name">${c.name}</span>
                <span class="country-board">${c.board}</span>
            </button>
        `).join('');

        countryGrid.querySelectorAll('.country-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                countryGrid.querySelectorAll('.country-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');

                setTimeout(() => goToStep(2), 400);
            });
        });
    }

    // Helper function for step navigation
    function goToStep(step) {
        // Check if editing profile dynamically (not from closure)
        const isEditingProfile = onboardingModal?.dataset.editMode === 'true';

        // If editing profile and trying to go to step 5, save profile instead
        if (isEditingProfile && step === 5) {
            saveEditedProfile();
            return;
        }

        document.querySelector(`.onboarding-step[data-step="${currentStep}"]`)?.classList.remove('active');
        currentStep = step;
        // Store current step in data attribute for persistence
        if (onboardingModal) {
            onboardingModal.dataset.currentStep = step.toString();
        }
        document.querySelector(`.onboarding-step[data-step="${currentStep}"]`)?.classList.add('active');


        if (step > 0) {
            updateProgressBar(currentStep);
        }
    }

    // Save profile when editing (skip account creation)
    async function saveEditedProfile() {
        console.log("💾 Saving edited profile...");
        const profile = collectOnboardingData(selectedEducationLevel, selectedDepartment);

        if (profile) {
            // Keep existing user info
            const existingProfile = getStudentProfile();
            if (existingProfile) {
                profile.userId = existingProfile.userId;
                profile.email = existingProfile.email;
                profile.displayName = existingProfile.displayName;
            }

            await saveStudentProfile(profile);

            // Reset edit mode flag
            const modal = document.getElementById('onboarding-modal');
            if (modal) {
                modal.dataset.editMode = 'false';
                modal.classList.add('hidden');
            }

            // Reset the button text back to "Continue"
            const step4NextBtn = document.querySelector('.onboarding-step[data-step="4"] .onboarding-next');
            if (step4NextBtn) {
                step4NextBtn.textContent = 'Continue →';
            }

            addMessageToChat("✅ Profile updated successfully!", "system");
            console.log("✅ Profile updated!");
        } else {
            alert("Please complete all profile selections");
        }
    }

    function updateProgressBar(step) {
        const progressBar = document.getElementById('onboarding-progress');
        if (progressBar) {
            progressBar.style.width = `${(step / 5) * 100}%`;
        }

        document.querySelectorAll('.progress-step').forEach((s, i) => {
            if (i + 1 < step) s.classList.add('completed');
            else s.classList.remove('completed');
            if (i + 1 === step) s.classList.add('active');
            else s.classList.remove('active');
        });
    }

    // Education level selection
    const levelGrid = document.getElementById('level-grid');
    levelGrid?.querySelectorAll('.level-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            levelGrid.querySelectorAll('.level-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            selectedEducationLevel = btn.dataset.level;
            updateStep3ForLevel(selectedEducationLevel);

            setTimeout(() => goToStep(3), 400);
        });
    });


    const deptGrid = document.getElementById('department-grid');
    deptGrid?.querySelectorAll('.dept-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            deptGrid.querySelectorAll('.dept-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            selectedDepartment = btn.dataset.dept;
            updateProgramsForDepartment(selectedDepartment);
            // Auto-advance after selection
            setTimeout(() => goToStep(4), 400);
        });
    });


    document.querySelectorAll('.onboarding-next').forEach(btn => {
        btn.addEventListener('click', () => {
            console.log("🔵 Continue button clicked!");
            // Read current step from data attribute for accurate tracking
            const modal = document.getElementById('onboarding-modal');
            currentStep = parseInt(modal?.dataset.currentStep || currentStep.toString());
            console.log("🔵 Current step from data:", currentStep, "Going to:", currentStep + 1);

            goToStep(currentStep + 1);

            if (currentStep === 3 && selectedEducationLevel) {
                updateStep3ForLevel(selectedEducationLevel);
            }
        });
    });

    document.querySelectorAll('.onboarding-back').forEach(btn => {
        btn.addEventListener('click', () => {
            console.log("🔵 Back button clicked!");
            // Read current step from data attribute for accurate tracking
            const modal = document.getElementById('onboarding-modal');
            currentStep = parseInt(modal?.dataset.currentStep || currentStep.toString());

            goToStep(currentStep - 1);
        });
    });

    // Skip account creation (use local storage only)
    document.getElementById('skip-account-btn')?.addEventListener('click', async (e) => {
        e.preventDefault();
        console.log("⏭️ Skipping account creation - using local storage");

        const profile = collectOnboardingData(selectedEducationLevel, selectedDepartment);
        if (profile) {
            await saveStudentProfile(profile);
            document.getElementById('onboarding-modal')?.classList.add('hidden');
            addMessageToChat("👋 Welcome! Your progress is saved locally. Create an account anytime to sync across devices!", "system");
            await greetStudent();
        }
    });


    document.getElementById('complete-onboarding')?.addEventListener('click', async () => {
        console.log("🚀 Create Account & Start button clicked!");


        const fullName = document.getElementById('signup-fullname')?.value?.trim();
        const email = document.getElementById('signup-onboarding-email')?.value?.trim();
        const password = document.getElementById('signup-onboarding-password')?.value;
        const confirmPassword = document.getElementById('signup-confirm-password')?.value;

        // Validate signup fields
        if (!fullName || !email || !password) {
            alert("Please fill in all required fields (Name, Email, Password)");
            return;
        }

        if (password !== confirmPassword) {
            alert("Passwords do not match!");
            return;
        }

        if (password.length < 6) {
            alert("Password must be at least 6 characters");
            return;
        }

        console.log("Selected education level:", selectedEducationLevel);
        console.log("Selected department:", selectedDepartment);

        try {

            console.log("📝 Creating account...");
            const signupResult = await signupWithEmail(email, password, fullName, 10);

            if (!signupResult.success) {
                alert(`Account creation failed: ${signupResult.error}`);
                return;
            }

            console.log("✅ Account created successfully!");


            if (selectedProfilePic) {
                console.log("📸 Uploading profile picture...");
                const uploadResult = await uploadProfilePicture(selectedProfilePic);
                if (uploadResult.success) {
                    console.log("✅ Profile picture uploaded");
                }
            }

            // Update display name
            await updateDisplayName(fullName);


            const profile = collectOnboardingData(selectedEducationLevel, selectedDepartment);
            console.log("📋 Collected profile data:", profile);

            if (profile) {
                console.log("💾 Saving student profile...");
                profile.userId = signupResult.user.uid;
                profile.email = email;
                profile.displayName = fullName;

                await saveStudentProfile(profile);
                console.log("✅ Profile saved successfully!");

                const modal = document.getElementById('onboarding-modal');
                if (modal) {
                    modal.classList.add('hidden');
                    console.log("✅ Modal hidden");
                }


                updateProfileDisplay(signupResult.user);

                // Welcome message
                addMessageToChat(`🎉 Welcome, ${fullName}! Your account has been created successfully. Let's start learning!`, "system");

                await greetStudent();
                console.log("✅ Greeting complete!");
            } else {
                console.error("❌ No profile data collected!");
                alert("Please complete all steps before starting.");
            }
        } catch (error) {
            console.error("❌ Error in onboarding completion:", error);
            alert("Error creating account. Please try again.");
        }
    });


    document.getElementById('skip-onboarding')?.addEventListener('click', async () => {
        console.log("🔵 Skip Setup button clicked!");
        const modal = document.getElementById('onboarding-modal');
        const isEditing = modal?.dataset.editMode === 'true';
        console.log("🔵 Is editing mode:", isEditing);

        if (isEditing) {
            // Just close the modal when editing - don't change profile
            modal.dataset.editMode = 'false';
            modal.classList.add('hidden');
            addMessageToChat("✏️ Profile editing cancelled", "system");
        } else {
            // New user - save default profile
            await saveStudentProfile({
                country: 'bangladesh',
                countryName: 'Bangladesh',
                board: 'NCTB',
                educationLevel: 'secondary',
                class: '10',
                stream: 'science',
                subjects: ['Physics', 'Chemistry', 'Mathematics', 'Biology', 'English', 'ICT'],
                language: 'en-US'
            });
            modal?.classList.add('hidden');
            await greetStudent();
        }
    });
}

function updateStep3ForLevel(level) {
    const classGrid = document.getElementById('class-grid');
    const deptGrid = document.getElementById('department-grid');
    const step3Title = document.getElementById('step3-title');
    const step3Desc = document.getElementById('step3-desc');

    const isUniversity = level === 'undergraduate' || level === 'postgraduate' || level === 'doctoral';

    if (isUniversity) {
        // Show department selection for university
        classGrid?.classList.add('hidden');
        deptGrid?.classList.remove('hidden');
        step3Title.textContent = '🏛️ Select Your Department';
        step3Desc.textContent = 'What field are you studying?';
    } else {

        classGrid?.classList.remove('hidden');
        deptGrid?.classList.add('hidden');
        step3Title.textContent = '📖 Select Your Class';
        step3Desc.textContent = 'What class are you studying in?';


        const levelInfo = EDUCATION_LEVELS[level];
        if (levelInfo && levelInfo.grades && classGrid) {
            classGrid.innerHTML = levelInfo.grades.map(g => `
                <button class="class-btn" data-class="${g}">Class ${g}</button>
            `).join('');

            classGrid.querySelectorAll('.class-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    classGrid.querySelectorAll('.class-btn').forEach(b => b.classList.remove('selected'));
                    btn.classList.add('selected');
                    // Auto-advance to step 4 after class selection
                    setTimeout(() => {
                        document.querySelector('.onboarding-step[data-step="3"]')?.classList.remove('active');
                        document.querySelector('.onboarding-step[data-step="4"]')?.classList.add('active');
                        const progressBar = document.getElementById('onboarding-progress');
                        if (progressBar) progressBar.style.width = '100%';
                    }, 400);
                });
            });
        }
    }


    updateStep4ForLevel(level);
}

function updateStep4ForLevel(level) {
    const streamGrid = document.getElementById('stream-grid');
    const programGrid = document.getElementById('program-grid');
    const yearGrid = document.getElementById('year-grid');
    const step4Title = document.getElementById('step4-title');
    const step4Desc = document.getElementById('step4-desc');

    const isUniversity = level === 'undergraduate' || level === 'postgraduate' || level === 'doctoral';
    const hasStream = level === 'secondary' || level === 'higher_secondary';

    if (isUniversity) {
        streamGrid?.classList.add('hidden');
        programGrid?.classList.remove('hidden');
        yearGrid?.classList.remove('hidden');
        step4Title.textContent = '📚 Select Your Program & Year';
        step4Desc.textContent = 'Choose your program and current year';
    } else if (hasStream) {
        streamGrid?.classList.remove('hidden');
        programGrid?.classList.add('hidden');
        yearGrid?.classList.add('hidden');
        step4Title.textContent = '🎯 Select Your Stream';
        step4Desc.textContent = 'Choose your academic stream';


        streamGrid?.querySelectorAll('.stream-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                streamGrid.querySelectorAll('.stream-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
            });
        });
    } else {
        // Primary/Middle school - no stream needed
        streamGrid?.classList.add('hidden');
        programGrid?.classList.add('hidden');
        yearGrid?.classList.add('hidden');
        step4Title.textContent = '✅ Ready to Start!';
        step4Desc.textContent = 'You\'re all set to begin learning';
    }
}

function updateProgramsForDepartment(deptId) {
    const programGrid = document.getElementById('program-grid');
    if (!programGrid) return;

    const programs = getDepartmentPrograms(deptId);

    programGrid.innerHTML = programs.map(p => `
        <button class="program-btn" data-program="${p.code.toLowerCase().replace(/[^a-z]/g, '')}">
            <span class="program-code">${p.code}</span>
            <span class="program-name">${p.name}</span>
        </button>
    `).join('');

    programGrid.querySelectorAll('.program-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            programGrid.querySelectorAll('.program-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
        });
    });


    const yearGrid = document.getElementById('year-grid');
    yearGrid?.querySelectorAll('.year-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            yearGrid.querySelectorAll('.year-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
        });
    });
}

function collectOnboardingData(educationLevel, department) {
    console.log("📝 Collecting onboarding data...");

    const selectedCountry = document.querySelector('.country-btn.selected')?.dataset.country || 'bangladesh';
    const selectedLevel = document.querySelector('.level-btn.selected')?.dataset.level || educationLevel || 'secondary';
    const selectedClass = document.querySelector('.class-btn.selected')?.dataset.class || '10';
    const selectedStream = document.querySelector('.stream-btn.selected')?.dataset.stream || 'science';
    const selectedProgram = document.querySelector('.program-btn.selected')?.dataset.program;
    const selectedYear = document.querySelector('.year-btn.selected')?.dataset.year || '1';
    const selectedDept = document.querySelector('.dept-btn.selected')?.dataset.dept || department;

    console.log("Selections:", {
        country: selectedCountry,
        level: selectedLevel,
        class: selectedClass,
        stream: selectedStream,
        program: selectedProgram,
        year: selectedYear,
        dept: selectedDept
    });

    const country = getCountry(selectedCountry) || COUNTRIES[0];
    const isUniversity = selectedLevel === 'undergraduate' || selectedLevel === 'postgraduate' || selectedLevel === 'doctoral';


    if (isUniversity && !selectedDept) {
        console.error("❌ No department selected for university level");
        return null;
    }

    // Get subjects based on profile
    let subjects = [];
    if (isUniversity && selectedDept && selectedProgram) {
        const prog = getUniversityProgram(selectedDept, selectedProgram);
        subjects = prog?.subjects || [];
    } else {
        subjects = getSubjectsForClass(selectedCountry, selectedClass, selectedStream);
    }

    const profile = {
        country: selectedCountry,
        countryName: country.name,
        board: country.board,
        educationLevel: selectedLevel,
        language: country.language || 'en-US'
    };

    if (isUniversity) {
        profile.department = selectedDept;
        profile.program = selectedProgram;
        profile.year = selectedYear;
        profile.subjects = subjects;


        const prog = getUniversityProgram(selectedDept, selectedProgram);
        profile.programName = prog?.name || selectedProgram;
        profile.programCode = prog?.code || selectedProgram?.toUpperCase();
    } else {
        profile.class = selectedClass;
        profile.stream = selectedStream;
        profile.subjects = subjects;
    }

    return profile;
}


// Initialize TalkingHead Avatar

// Track loading state to prevent double downloads
let isAvatarLoading = false;
let isAvatarLoaded = false;
let isClassroomLoading = false;
let isClassroomLoaded = false;

async function initializeAvatar() {
    // Prevent double initialization
    if (isAvatarLoading) {
        console.log("⚠️ Avatar already loading, skipping duplicate call");
        return;
    }
    if (isAvatarLoaded) {
        console.log("⚠️ Avatar already loaded");
        return;
    }

    isAvatarLoading = true;

    try {
        elements.loading.classList.remove("hidden");
        elements.loadingText.textContent = "Initializing Avatar...";

        console.log("🎭 Creating TalkingHead instance...");
        console.time("⏱️ Avatar Load");

        head = new TalkingHead(elements.avatar, {
            // TTS Settings
            ttsEndpoint: CONFIG.googleTTSEndpoint,
            ttsApikey: CONFIG.googleTTSKey,

            lipsyncModules: ["en", "fi"],
            lipsyncLang: "en",

            avatarMood: "neutral",
            avatarMute: false,

            // Realistic eye contact while teaching
            avatarIdleEyeContact: 0.3,
            avatarIdleHeadMove: 0.5,
            avatarSpeakingEyeContact: 0.7,    // 70% eye contact while speaking
            avatarSpeakingHeadMove: 0.6,

            modelPixelRatio: window.devicePixelRatio || 1,
            modelFPS: 30,
            modelMovementFactor: 0.8,         // Natural body movement

            cameraZoomEnable: true,
            cameraRotateEnable: true,
            cameraPanEnable: true,

            lightAmbientColor: 0xffc0cb,      // Pink ambient
            lightAmbientIntensity: 0.8,
            lightDirectColor: 0xffeedd,
            lightDirectIntensity: 2,
            lightDirectPhi: 1,
            lightDirectTheta: 2
        });

        window.head = head;

        // Load saved teacher preference
        const savedTeacher = localStorage.getItem('intella_teacher_preference') || 'male';
        const teacherConfig = CONFIG.teacherAvatars[savedTeacher] || CONFIG.teacherAvatars.male;
        CONFIG.currentTeacher = savedTeacher;
        CONFIG.avatarUrl = teacherConfig.url;

        CONFIG.tts.elevenLabsVoice = teacherConfig.elevenLabsVoice;
        console.log(`🎙️ TTS Voice set to: ${teacherConfig.elevenLabsVoice} (${teacherConfig.name})`);

        elements.loadingText.textContent = `Loading ${teacherConfig.name} Teacher...`;
        console.log("📦 Loading avatar from:", teacherConfig.url);

        await head.showAvatar({
            url: teacherConfig.url,
            body: teacherConfig.body,
            avatarMood: "neutral",
            ttsLang: "en-GB",
            ttsVoice: teacherConfig.ttsVoice,
            ttsRate: CONFIG.ttsRate,
            ttsPitch: CONFIG.ttsPitch,
            lipsyncLang: "en",
            // Realistic eye contact for speaking
            avatarIdleEyeContact: 0.3,
            avatarSpeakingEyeContact: 0.7,
            avatarIdleHeadMove: 0.5,
            avatarSpeakingHeadMove: 0.6
        }, (event) => {
            if (event.lengthComputable) {
                const progress = Math.min(100, Math.round((event.loaded / event.total) * 100));
                if (elements.loadingProgress) {
                    elements.loadingProgress.style.width = `${progress}%`;
                }
                if (elements.loadingText) {
                    elements.loadingText.textContent = `Loading Avatar... ${progress}%`;
                }
            }
        });

        console.timeEnd("⏱️ Avatar Load");
        isAvatarLoaded = true;

        // ✅ HIDE LOADING SCREEN IMMEDIATELY - User can see avatar now
        elements.loading.classList.add("hidden");

        TeacherBehavior.configureForTeaching();

        // Load classroom in background (non-blocking)
        console.log("🏫 Loading classroom in background...");
        loadClassroomBackground().then(() => {
            console.log("✅ Classroom loaded");
        }).catch(err => {
            console.error("❌ Classroom load failed:", err);
        });

        console.log("✅ Avatar visible and ready!");

    } catch (error) {
        console.error("❌ Error loading avatar:", error);
        elements.loadingText.textContent = "Avatar loading failed. Chat still works!";
        head = null;
        isAvatarLoaded = false;

        setTimeout(() => {
            elements.loading.classList.add("hidden");
        }, 2000);
    } finally {
        isAvatarLoading = false;
    }
}

// ===========================================


async function loadClassroomBackground() {
    // Prevent double loading
    if (isClassroomLoading) {
        console.log("⚠️ Classroom already loading, skipping duplicate call");
        return;
    }
    if (isClassroomLoaded) {
        console.log("⚠️ Classroom already loaded");
        return;
    }

    if (!head || !head.scene) {
        console.log("⚠️ No scene available for classroom background");
        return;
    }

    isClassroomLoading = true;

    try {
        console.log("🏫 Loading classroom background...");
        console.time("⏱️ Classroom Load");

        // STOP TalkingHead's camera animation by setting cameraClock to null
        head.cameraClock = null;

        head.scene.background = new THREE.Color(0xfdb777);

        // Setup Draco decoder for compressed GLB
        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');

        const loader = new GLTFLoader();
        loader.setDRACOLoader(dracoLoader);

        const gltf = await new Promise((resolve, reject) => {
            loader.load(
                CONFIG.classroomUrl,
                (gltf) => resolve(gltf),
                (progress) => {
                    if (progress.lengthComputable) {
                        const percent = Math.round((progress.loaded / progress.total) * 100);
                        console.log(`📦 Classroom loading: ${percent}%`);
                    }
                },
                (error) => reject(error)
            );
        });

        const classroom = gltf.scene;



        // Canvas camera: { position: [0, 0, 0.0001] }


        // Environment: preset="sunset"



        // 1. Set camera at first bench (level, looking straight at teacher)
        if (head.camera) {
            head.camera.position.set(0, 0, 2);
            head.camera.lookAt(0, 0, -5);
            head.camera.fov = 60;               // Balanced view
            head.camera.near = 0.001;
            head.camera.far = 1000;
            head.camera.updateProjectionMatrix();
            console.log("📷 Camera at first bench position (level view)");
        }


        classroom.position.set(0.2, -1.7, -2);
        classroom.scale.set(1, 1, 1);
        classroom.rotation.set(0, 0, 0);


        classroom.traverse((child) => {
            if (child.isMesh) {
                child.frustumCulled = false;
                child.castShadow = true;
                child.receiveShadow = true;
                if (child.material) {
                    child.material.side = THREE.DoubleSide;
                    child.material.needsUpdate = true;
                }
            }
        });

        // Add classroom to scene
        head.scene.add(classroom);



        // X: left/right, Y: up/down (floor level), Z: forward/back (negative = toward board)
        if (head.armature) {
            head.armature.position.set(0.1, -6.7, -5);
            head.armature.scale.set(1.5, 1.5, 1.5);
            head.armature.rotation.y = THREE.MathUtils.degToRad(0);
            console.log("👩‍🏫 Armature positioned at:", head.armature.position.toArray());
        } else {
            console.log("⚠️ head.armature not found, trying scene children...");
            // Find avatar mesh in scene
            head.scene.traverse((child) => {
                if (child.isSkinnedMesh || child.name.includes('Avatar') || child.name.includes('Body')) {
                    console.log("Found mesh:", child.name, child.type);
                }
            });
        }


        if (head.lightAmbient) {
            head.lightAmbient.intensity = 0.8;
            head.lightAmbient.color.set(0xffc0cb);
        }
        if (head.lightDirect) {
            head.lightDirect.intensity = 2;
            head.lightDirect.color.set(0xffeedd); // Warm sunset
            head.lightDirect.position.set(5, 5, 5);
        }


        if (head.controls) {
            head.controls.enabled = true;
            head.controls.enableZoom = true;
            head.controls.enableRotate = true;     // Allow rotation to look around
            head.controls.enablePan = false;
            head.controls.target.set(0, 0, -5);
            head.controls.minDistance = 1;         // Minimum zoom in
            head.controls.maxDistance = 5;
            head.controls.minPolarAngle = Math.PI * 0.3;
            head.controls.maxPolarAngle = Math.PI * 0.7;  // Limit vertical rotation
            head.controls.update();
        }


        window.classroom = classroom;

        console.timeEnd("⏱️ Classroom Load");
        isClassroomLoaded = true;

        console.log("✅ Classroom loaded like r3f-ai-language-teacher!");
        console.log("📷 Camera:", head.camera?.position ? [head.camera.position.x, head.camera.position.y, head.camera.position.z] : 'N/A');
        console.log("🏫 Classroom:", classroom?.position ? [classroom.position.x, classroom.position.y, classroom.position.z] : 'N/A');
        console.log("👩‍🏫 Avatar:", head.avatar?.position ? [head.avatar.position.x, head.avatar.position.y, head.avatar.position.z] : 'N/A');

    } catch (error) {
        console.error("❌ Error loading classroom:", error);
        isClassroomLoaded = false;
    } finally {
        isClassroomLoading = false;
    }
}


// Switch Teacher Avatar (Male/Female)

async function switchTeacher(teacherType) {
    if (!CONFIG.teacherAvatars[teacherType]) {
        console.error("❌ Invalid teacher type:", teacherType);
        return;
    }

    // Prevent switching to the same teacher
    if (CONFIG.currentTeacher === teacherType) {
        console.log("Already using this teacher");
        return;
    }

    const teacherConfig = CONFIG.teacherAvatars[teacherType];

    console.log(`🔄 Switching to ${teacherConfig.name} teacher...`);

    elements.loading.classList.remove("hidden");
    elements.loadingText.textContent = `Loading ${teacherConfig.name} teacher...`;
    if (elements.loadingProgress) {
        elements.loadingProgress.style.width = "0%";
    }

    try {
        // Stop any ongoing speech/animation
        if (head) {
            head.stop();
        }

        // Update config BEFORE loading
        CONFIG.currentTeacher = teacherType;
        CONFIG.avatarUrl = teacherConfig.url;
        CONFIG.tts.elevenLabsVoice = teacherConfig.elevenLabsVoice;

        // Use showAvatar - now preserves scene objects (lights, classroom)
        await head.showAvatar({
            url: teacherConfig.url,
            body: teacherConfig.body,
            avatarMood: "neutral",
            ttsLang: "en-GB",
            ttsVoice: teacherConfig.ttsVoice,
            ttsRate: CONFIG.ttsRate,
            ttsPitch: CONFIG.ttsPitch,
            lipsyncLang: "en",
            avatarIdleEyeContact: 0.3,
            avatarSpeakingEyeContact: 0.7,
            avatarIdleHeadMove: 0.5,
            avatarSpeakingHeadMove: 0.6
        }, (event) => {
            if (event.lengthComputable) {
                const percent = Math.round((event.loaded / event.total) * 100);
                if (elements.loadingProgress) {
                    elements.loadingProgress.style.width = `${percent}%`;
                }
                if (elements.loadingText) {
                    elements.loadingText.textContent = `Loading ${teacherConfig.name}... ${percent}%`;
                }
            }
        });

        // Position the new avatar in the classroom
        if (head.armature) {
            // Find the gltf.scene parent container
            let avatarContainer = head.armature;
            while (avatarContainer.parent && avatarContainer.parent !== head.scene) {
                avatarContainer = avatarContainer.parent;
            }

            // Reset container to origin (important!)
            avatarContainer.position.set(0, 0, 0);
            avatarContainer.scale.set(1, 1, 1);
            avatarContainer.rotation.set(0, 0, 0);

            // Position the armature directly (like loadClassroomBackground does)
            head.armature.position.set(0.1, -6.7, -5);
            head.armature.scale.set(1.5, 1.5, 1.5);
            head.armature.rotation.y = THREE.MathUtils.degToRad(0);

            // Ensure all meshes are visible and have proper materials
            avatarContainer.traverse((child) => {
                child.visible = true;
                child.frustumCulled = false;
                if (child.isMesh || child.isSkinnedMesh) {
                    if (child.material) {
                        child.material.needsUpdate = true;
                    }
                }
            });

            // Force skeleton and skinned mesh update
            avatarContainer.traverse((child) => {
                if (child.isSkinnedMesh) {
                    child.skeleton?.update();
                    child.updateMatrixWorld(true);
                }
                if (child.isBone) {
                    child.updateMatrixWorld(true);
                }
            });

            // Force a scene update
            head.scene.updateMatrixWorld(true);
        }

        // Save preference
        localStorage.setItem('intella_teacher_preference', teacherType);

        // Update Edge TTS voice to match teacher gender
        const savedVoiceLang = localStorage.getItem('intella_voice_language') || 'bn-BD';
        if (EDGE_TTS_VOICES[savedVoiceLang]) {
            CONFIG.tts.edgeVoice = EDGE_TTS_VOICES[savedVoiceLang][teacherType] || EDGE_TTS_VOICES[savedVoiceLang].female;
            console.log(`🎤 Updated Edge TTS voice to: ${CONFIG.tts.edgeVoice} (${teacherType})`);
        }

        // If Live session is active, restart with new voice (male=Charon, female=Aoede)
        if (isLiveSessionActive && liveChatController) {
            console.log(`🔄 Restarting Live session with ${teacherType === 'male' ? 'Charon' : 'Aoede'} voice...`);
            stopLiveSession();
            // Small delay then restart
            setTimeout(() => {
                startLiveSession();
            }, 500);
        }

        elements.loading.classList.add("hidden");

        // Greet with the new teacher
        const greetingName = `${teacherConfig.title} ${teacherConfig.name}`;
        addMessageToChat(`👋 Hello! I'm ${greetingName}, your new teacher. How can I help you today?`, "teacher");

        // Teacher greeting animation
        if (head) {
            TeacherBehavior.greetingSequence();
            await speakText(`Hello! I'm ${greetingName}. How can I help you today?`);
        }

        console.log(`✅ Switched to ${teacherConfig.name} teacher successfully!`);

    } catch (error) {
        console.error("❌ Error switching teacher:", error);
        elements.loading.classList.add("hidden");
        addMessageToChat(`⚠️ Could not switch to ${teacherConfig.name} teacher. Please try again.`, "system");
    }
}


window.switchTeacher = switchTeacher;


// Greet Student (Updated for University Students)

async function greetStudent() {
    const teacherName = CONFIG.teacherAvatars[CONFIG.currentTeacher]?.name || "Abubokkor";
    let greeting;

    if (studentProfile) {
        const isUniversity = ['undergraduate', 'postgraduate', 'doctoral'].includes(studentProfile.educationLevel);

        if (isUniversity) {
            const yearText = studentProfile.year ? `${studentProfile.year}${getOrdinalSuffix(studentProfile.year)} year` : '';
            greeting = `Hello! Welcome back! I'm ${teacherName}, your ${studentProfile.programCode || studentProfile.programName || 'university'} teacher. ${yearText ? `You're in your ${yearText}.` : ''} What would you like to learn today? I can help with ${studentProfile.subjects?.slice(0, 3).join(', ')} and more!`;
        } else {
            greeting = `Hello! Welcome back! I'm ${teacherName}, your ${studentProfile.board} teacher. You're studying Class ${studentProfile.class} ${studentProfile.stream}. What would you like to learn today?`;
        }
    } else {
        greeting = `Hello! I'm ${teacherName}, your virtual teacher. What would you like to learn today?`;
    }

    // Add greeting to chat (don't save to history - it's just a welcome)
    addMessageToChat(greeting, "teacher", false);

    // Make the avatar speak with realistic greeting behavior
    if (head) {
        // Use TeacherBehavior for realistic greeting sequence
        await TeacherBehavior.greetingSequence();
        await speakText(greeting);

        // Return to idle after greeting
        setTimeout(() => {
            TeacherBehavior.startIdleBehavior();
        }, 3000);
    }
}

function getOrdinalSuffix(num) {
    const n = parseInt(num);
    if (n === 1) return 'st';
    if (n === 2) return 'nd';
    if (n === 3) return 'rd';
    return 'th';
}

// ===========================================
// Event Listeners Setup
// ===========================================
function setupEventListeners() {
    // Send message
    elements.sendBtn?.addEventListener("click", handleSendMessage);

    // Enter key to send
    elements.userInput?.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    });

    // Auto-resize textarea
    elements.userInput?.addEventListener("input", () => {
        elements.userInput.style.height = "auto";
        elements.userInput.style.height = Math.min(elements.userInput.scrollHeight, 150) + "px";
    });

    // Voice input
    elements.micBtn?.addEventListener("click", toggleVoiceInput);

    // Language dropdown for speech input
    const langSwitchBtn = document.getElementById("lang-switch-btn");
    const langDropdown = document.getElementById("lang-dropdown");
    const langSearchInput = document.getElementById("lang-search-input");
    const currentLangSpan = document.getElementById("current-lang");

    // Language name mapping for display
    const LANG_DISPLAY_NAMES = {
        'en-US': 'EN', 'en-GB': 'UK', 'en-AU': 'AU', 'en-CA': 'CA', 'en-IN': 'IN',
        'bn-BD': 'বাং', 'bn-IN': 'বাং', 'hi-IN': 'हि', 'ta-IN': 'த', 'te-IN': 'తె',
        'mr-IN': 'म', 'gu-IN': 'ગુ', 'kn-IN': 'ಕ', 'ml-IN': 'മ', 'ne-NP': 'ने',
        'si-LK': 'සි', 'ur-PK': 'ار', 'ur-IN': 'ار',
        'fr-FR': 'FR', 'de-DE': 'DE', 'es-ES': 'ES', 'es-MX': 'MX', 'it-IT': 'IT',
        'pt-BR': 'BR', 'pt-PT': 'PT', 'nl-NL': 'NL', 'pl-PL': 'PL', 'ru-RU': 'RU',
        'uk-UA': 'UA', 'el-GR': 'GR', 'tr-TR': 'TR', 'sv-SE': 'SE', 'da-DK': 'DK',
        'nb-NO': 'NO', 'fi-FI': 'FI', 'cs-CZ': 'CZ', 'hu-HU': 'HU', 'ro-RO': 'RO',
        'zh-CN': '中', 'zh-TW': '台', 'zh-HK': '港', 'ja-JP': '日', 'ko-KR': '한',
        'vi-VN': 'VN', 'th-TH': 'ไท', 'id-ID': 'ID', 'ms-MY': 'MY', 'fil-PH': 'PH',
        'km-KH': 'ខ្មែ', 'my-MM': 'မြ',
        'ar-SA': 'عر', 'ar-EG': 'مص', 'ar-AE': 'إم', 'ar-MA': 'مغ',
        'he-IL': 'עב', 'fa-IR': 'فا', 'ps-AF': 'پښ',
        'af-ZA': 'AF', 'sw-KE': 'SW', 'am-ET': 'አማ', 'zu-ZA': 'ZU', 'so-SO': 'SO'
    };

    // Toggle dropdown
    langSwitchBtn?.addEventListener("click", (e) => {
        e.stopPropagation();
        langDropdown?.classList.toggle("hidden");
        if (!langDropdown?.classList.contains("hidden")) {
            langSearchInput?.focus();
        }
    });

    // Close dropdown when clicking outside
    document.addEventListener("click", (e) => {
        if (!e.target.closest(".lang-dropdown-container")) {
            langDropdown?.classList.add("hidden");
        }
    });

    // Search filter
    langSearchInput?.addEventListener("input", (e) => {
        const searchTerm = e.target.value.toLowerCase();
        document.querySelectorAll(".lang-item").forEach(item => {
            const text = item.textContent.toLowerCase();
            item.classList.toggle("hidden", !text.includes(searchTerm));
        });
    });

    // Language selection
    document.querySelectorAll(".lang-item").forEach(item => {
        item.addEventListener("click", () => {
            const newLang = item.dataset.lang;
            selectedLanguage = newLang;

            // Update button display
            currentLangSpan.textContent = LANG_DISPLAY_NAMES[newLang] || newLang.split('-')[0].toUpperCase();

            // Update selected state
            document.querySelectorAll(".lang-item").forEach(i => i.classList.remove("selected"));
            document.querySelectorAll(`.lang-item[data-lang="${newLang}"]`).forEach(i => i.classList.add("selected"));

            // Close dropdown
            langDropdown?.classList.add("hidden");

            // Save to localStorage
            localStorage.setItem("speechInputLang", newLang);

            // Notify user
            const langName = item.textContent.trim();
            addMessageToChat(`🌐 Speech input: ${langName}`, "system");

            // If recording, restart with new language
            if (isRecording) {
                stopVoiceInput();
                setTimeout(() => startVoiceInput(), 300);
            }

            console.log(`🎤 Speech input changed to: ${newLang}`);
        });
    });

    // Load saved language on startup
    const savedSpeechLang = localStorage.getItem("speechInputLang");
    if (savedSpeechLang) {
        selectedLanguage = savedSpeechLang;
        currentLangSpan.textContent = LANG_DISPLAY_NAMES[savedSpeechLang] || savedSpeechLang.split('-')[0].toUpperCase();
        document.querySelectorAll(`.lang-item[data-lang="${savedSpeechLang}"]`).forEach(i => i.classList.add("selected"));
    }

    // Language toggle button (legacy - keep for backward compatibility)
    const langToggleBtn = document.getElementById("lang-toggle-btn");
    const langIndicator = document.getElementById("lang-indicator");

    langToggleBtn?.addEventListener("click", () => {
        // Toggle between English and Bengali
        if (!studentProfile) {
            studentProfile = { language: "en" };
        }

        if (studentProfile.language === "en") {
            studentProfile.language = "bn";
            langIndicator.textContent = "বাং";
            addMessageToChat("🌐 Language switched to Bengali. Speak in Bangla!", "system");
        } else {
            studentProfile.language = "en";
            langIndicator.textContent = "EN";
            addMessageToChat("🌐 Language switched to English. Speak in English!", "system");
        }

        console.log(`Language switched to: ${TTS_LANGUAGES[studentProfile.language]?.name}`);
    });

    // Mode buttons
    document.querySelectorAll(".mode-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            setMode(btn.dataset.mode);
        });
    });

    // File upload
    elements.fileUploadBtn?.addEventListener("click", () => {
        elements.fileInput?.click();
    });

    elements.fileInput?.addEventListener("change", handleFileUpload);

    // Settings modal
    elements.settingsBtn?.addEventListener("click", () => {
        elements.settingsModal?.classList.remove("hidden");
    });

    elements.closeSettings?.addEventListener("click", () => {
        elements.settingsModal?.classList.add("hidden");
    });

    elements.saveSettings?.addEventListener("click", saveSettings);

    // Live Mode Toggle in Settings
    elements.liveModeToggle?.addEventListener("change", (e) => {
        isLiveModeEnabled = e.target.checked;
        localStorage.setItem('liveModeEnabled', isLiveModeEnabled);

        // Show/hide Live mode options
        if (elements.liveModeOptions) {
            elements.liveModeOptions.classList.toggle('hidden', !isLiveModeEnabled);
        }

        // Show/hide Live mic button
        if (elements.liveMicBtn) {
            elements.liveMicBtn.classList.toggle('hidden', !isLiveModeEnabled);
        }

        // If disabling, stop any active Live session
        if (!isLiveModeEnabled && isLiveSessionActive) {
            stopLiveSession();
        }

        console.log(`🎙️ Live Mode: ${isLiveModeEnabled ? 'Enabled' : 'Disabled'}`);
    });

    // Live Mic Button
    elements.liveMicBtn?.addEventListener("click", toggleLiveSession);

    // Teacher selector buttons
    const teacherOptions = document.querySelectorAll('.teacher-option');
    teacherOptions.forEach(btn => {
        btn.addEventListener('click', async () => {
            const teacherType = btn.dataset.teacher;

            // Update UI - remove selected from all, add to clicked
            teacherOptions.forEach(opt => opt.classList.remove('selected'));
            btn.classList.add('selected');

            // Switch teacher avatar
            await switchTeacher(teacherType);
        });
    });

    // Load saved teacher preference
    const savedTeacher = localStorage.getItem('intella_teacher_preference');
    if (savedTeacher && CONFIG.teacherAvatars[savedTeacher]) {
        const btn = document.querySelector(`.teacher-option[data-teacher="${savedTeacher}"]`);
        if (btn) {
            teacherOptions.forEach(opt => opt.classList.remove('selected'));
            btn.classList.add('selected');
            CONFIG.currentTeacher = savedTeacher;
            CONFIG.avatarUrl = CONFIG.teacherAvatars[savedTeacher].url;
        }
    }

    // Click outside modal to close
    elements.settingsModal?.addEventListener("click", (e) => {
        if (e.target === elements.settingsModal) {
            elements.settingsModal.classList.add("hidden");
        }
    });

    // Theme toggle
    elements.themeToggle?.addEventListener("click", toggleTheme);

    // Chat Panel Toggle (new Liquid Glass UI)
    elements.toggleChatBtn?.addEventListener("click", toggleChatPanel);
    elements.closeChatBtn?.addEventListener("click", () => {
        elements.chatPanel?.classList.add("hidden");
    });

    // Quick action buttons
    elements.quickButtons?.forEach(btn => {
        btn.addEventListener("click", () => {
            const action = btn.dataset.action;
            handleQuickAction(action);
        });
    });

    // Range sliders
    elements.speechRate?.addEventListener("input", () => {
        const value = parseFloat(elements.speechRate.value);
        elements.rateValue.textContent = `${value.toFixed(1)}x`;
        CONFIG.ttsRate = value;
    });

    elements.speechPitch?.addEventListener("input", () => {
        const value = parseInt(elements.speechPitch.value);
        elements.pitchValue.textContent = value;
        CONFIG.ttsPitch = value;
    });

    // Progress button
    elements.progressBtn?.addEventListener("click", toggleProgressPanel);

    // Stop/Pause speech button
    elements.stopBtn?.addEventListener("click", () => {
        if (isSpeaking) {
            stopSpeech();
        }
    });

    // Long press on stop button to pause (optional)
    let stopBtnPressTimer = null;
    elements.stopBtn?.addEventListener("mousedown", () => {
        stopBtnPressTimer = setTimeout(() => {
            togglePauseSpeech();
        }, 500); // Long press = 500ms
    });
    elements.stopBtn?.addEventListener("mouseup", () => {
        clearTimeout(stopBtnPressTimer);
    });
    elements.stopBtn?.addEventListener("mouseleave", () => {
        clearTimeout(stopBtnPressTimer);
    });

    // Visibility change - pause/resume avatar
    document.addEventListener("visibilitychange", () => {
        if (head) {
            if (document.visibilityState === "visible") {
                head.start();
            } else {
                head.stop();
            }
        }
    });

    // ===========================================
    // AUTH BUTTON EVENT LISTENERS
    // ===========================================

    // Credits button - show credits info from database
    const creditsBtn = document.getElementById("credits-btn");
    creditsBtn?.addEventListener("click", () => {
        showCreditsInfo();
    });

    // ===========================================
    // TEXTBOOK LIBRARY EVENT LISTENERS
    // ===========================================

    // Library button - open library modal
    const libraryBtn = document.getElementById("library-btn");
    libraryBtn?.addEventListener("click", openLibraryModal);

    // Close library modal
    const closeLibraryBtn = document.getElementById("closeLibrary");
    closeLibraryBtn?.addEventListener("click", closeLibraryModal);

    // Library tabs
    document.querySelectorAll('.library-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            switchLibraryTab(tab.dataset.tab);
        });
    });

    // Library file input
    const libraryFileInput = document.getElementById("library-file-input");
    libraryFileInput?.addEventListener("change", handleLibraryFileSelect);

    // Cancel upload
    const cancelUploadBtn = document.getElementById("cancel-upload-btn");
    cancelUploadBtn?.addEventListener("click", hideUploadForm);

    // Confirm upload
    const confirmUploadBtn = document.getElementById("confirm-upload-btn");
    confirmUploadBtn?.addEventListener("click", confirmUpload);

    // Back to library from chapters
    const backToLibraryBtn = document.getElementById("backToLibrary");
    backToLibraryBtn?.addEventListener("click", () => {
        document.getElementById('chapter-modal')?.classList.add('hidden');
        document.getElementById('library-modal')?.classList.remove('hidden');
    });

    // Close chapter modal
    const closeChapterBtn = document.getElementById("closeChapter");
    closeChapterBtn?.addEventListener("click", () => {
        document.getElementById('chapter-modal')?.classList.add('hidden');
    });

    // Click outside library modal to close
    const libraryModal = document.getElementById("library-modal");
    libraryModal?.addEventListener("click", (e) => {
        if (e.target === libraryModal) {
            closeLibraryModal();
        }
    });

    // Click outside chapter modal to close
    const chapterModal = document.getElementById("chapter-modal");
    chapterModal?.addEventListener("click", (e) => {
        if (e.target === chapterModal) {
            chapterModal.classList.add('hidden');
        }
    });

    // User button - toggle between login modal and profile
    const userBtn = document.getElementById("user-btn");
    userBtn?.addEventListener("click", () => {
        // Check if user is logged in OR has a local profile
        const hasLocalProfile = localStorage.getItem('intella_student_profile');

        if (getCurrentUser() || hasLocalProfile) {
            // User is logged in or has local profile, show profile
            showUserProfile();
        } else {
            // No profile at all, show onboarding
            showOnboarding();
        }
    });

    // Close auth modal
    const closeAuthBtn = document.getElementById("close-auth");
    closeAuthBtn?.addEventListener("click", () => {
        const authModal = document.getElementById("auth-modal");
        authModal?.classList.add("hidden");
    });

    // Click outside modal to close
    const authModal = document.getElementById("auth-modal");
    authModal?.addEventListener("click", (e) => {
        if (e.target === authModal) {
            authModal.classList.add("hidden");
        }
    });

    // Switch between login and signup forms
    const showSignupLink = document.getElementById("show-signup");
    const showLoginLink = document.getElementById("show-login");
    const loginForm = document.getElementById("login-form");
    const signupForm = document.getElementById("signup-form");

    showSignupLink?.addEventListener("click", (e) => {
        e.preventDefault();
        loginForm?.classList.add("hidden");
        signupForm?.classList.remove("hidden");
    });

    showLoginLink?.addEventListener("click", (e) => {
        e.preventDefault();
        signupForm?.classList.add("hidden");
        loginForm?.classList.remove("hidden");
    });

    // Login button
    const loginBtn = document.getElementById("login-btn");
    loginBtn?.addEventListener("click", async () => {
        const email = document.getElementById("login-email")?.value;
        const password = document.getElementById("login-password")?.value;

        if (!email || !password) {
            addMessageToChat("⚠️ Please enter both email and password", "system");
            return;
        }

        const result = await loginWithEmail(email, password);
        if (result.success) {
            authModal?.classList.add("hidden");
            addMessageToChat(`👋 Welcome back, ${result.user.displayName || result.user.email}!`, "system");

            // Load user progress and chat history
            await loadProgress();
            await loadChatHistory();
        } else {
            addMessageToChat(`❌ Login failed: ${result.error}`, "system");
        }
    });

    // Signup button
    const signupBtn = document.getElementById("signup-btn");
    signupBtn?.addEventListener("click", async () => {
        const name = document.getElementById("signup-name")?.value;
        const email = document.getElementById("signup-email")?.value;
        const password = document.getElementById("signup-password")?.value;
        const grade = document.getElementById("signup-grade")?.value;

        if (!name || !email || !password || !grade) {
            addMessageToChat("⚠️ Please fill in all fields", "system");
            return;
        }

        const result = await signupWithEmail(email, password, name, grade);
        if (result.success) {
            authModal?.classList.add("hidden");
            addMessageToChat(`🎉 Welcome to INTELLA, ${name}!`, "system");
        } else {
            addMessageToChat(`❌ Signup failed: ${result.error}`, "system");
        }
    });

    // Google login button (in login form)
    const googleLoginBtn = document.getElementById("google-login-btn");
    googleLoginBtn?.addEventListener("click", async () => {
        const result = await loginWithGoogle();
        if (result.success) {
            authModal?.classList.add("hidden");
            addMessageToChat(`👋 Welcome, ${result.user.displayName || result.user.email}!`, "system");

            // Load user progress and chat history
            await loadProgress();
            await loadChatHistory();
        } else {
            addMessageToChat(`❌ Google login failed: ${result.error}`, "system");
        }
    });

    // Google signup button (in signup form)
    const googleSignupBtn = document.getElementById("google-signup-btn");
    googleSignupBtn?.addEventListener("click", async () => {
        const result = await loginWithGoogle();
        if (result.success) {
            authModal?.classList.add("hidden");
            addMessageToChat(`🎉 Welcome to INTELLA, ${result.user.displayName || result.user.email}!`, "system");
        } else {
            addMessageToChat(`❌ Google signup failed: ${result.error}`, "system");
        }
    });

    // Logout button (also serves as "Clear Profile" for local-only users)
    const logoutBtn = document.getElementById("logout-btn");
    logoutBtn?.addEventListener("click", async () => {
        const authModal = document.getElementById("auth-modal");
        const userProfileDiv = document.getElementById("user-profile");

        if (getCurrentUser()) {
            // User is logged in - do actual logout
            const result = await logout();
            if (result.success) {
                userProfileDiv?.classList.add("hidden");
                authModal?.classList.add("hidden");

                // Clear local storage and reset state
                localStorage.removeItem('intella_student_profile');
                studentProfile = null;
                isOnboarded = false;

                addMessageToChat("👋 Logged out successfully", "system");

                // Show onboarding for next session
                setTimeout(() => {
                    showOnboarding();
                }, 1000);
            }
        } else {
            // Local-only user - just clear profile
            userProfileDiv?.classList.add("hidden");
            authModal?.classList.add("hidden");

            // Clear local storage and reset state
            localStorage.removeItem('intella_student_profile');
            studentProfile = null;
            isOnboarded = false;

            addMessageToChat("🗑️ Profile cleared. You can start fresh!", "system");

            // Show onboarding
            setTimeout(() => {
                showOnboarding();
            }, 1000);
        }
    });

    // Change Profile Picture (in user profile)
    const changeProfilePicBtn = document.getElementById("change-profile-pic-btn");
    const changeProfilePicInput = document.getElementById("change-profile-pic-input");

    changeProfilePicBtn?.addEventListener("click", () => {
        changeProfilePicInput?.click();
    });

    changeProfilePicInput?.addEventListener("change", async (e) => {
        const file = e.target.files[0];
        if (file) {
            const result = await uploadProfilePicture(file);
            if (result.success) {
                const profileAvatarImg = document.getElementById('profile-avatar-img');
                const profileAvatarText = document.getElementById('profile-avatar-text');

                if (profileAvatarImg) {
                    profileAvatarImg.src = result.photoURL;
                    profileAvatarImg.style.display = 'block';
                }
                if (profileAvatarText) {
                    profileAvatarText.style.display = 'none';
                }
                addMessageToChat("✅ Profile picture updated!", "system");
            } else {
                addMessageToChat(`❌ Failed to update picture: ${result.error}`, "system");
            }
        }
    });

    // Edit Profile button - opens onboarding to edit details
    const editProfileBtn = document.getElementById("edit-profile-btn");
    editProfileBtn?.addEventListener("click", () => {
        // Hide user profile display
        const userProfile = document.getElementById("user-profile");
        userProfile?.classList.add("hidden");

        // Show onboarding modal (skip step 0, go directly to step 1)
        const onboardingModal = document.getElementById("onboarding-modal");
        if (onboardingModal) {
            // Set edit mode flag and current step
            onboardingModal.dataset.editMode = 'true';
            onboardingModal.dataset.currentStep = '1'; // Start at step 1 for editing
            onboardingModal.classList.remove("hidden");

            // Hide step 0 (welcome) and show step 1 (country selection)
            document.querySelector('.onboarding-step[data-step="0"]')?.classList.remove('active');
            document.querySelector('.onboarding-step[data-step="1"]')?.classList.add('active');

            // Show progress bar and update it
            document.getElementById('progress-container')?.classList.remove('hidden');
            const progressBar = document.getElementById('onboarding-progress');
            if (progressBar) progressBar.style.width = '20%';

            // Update step 4's Continue button to say "Save Profile" when editing
            const step4NextBtn = document.querySelector('.onboarding-step[data-step="4"] .onboarding-next');
            if (step4NextBtn) {
                step4NextBtn.textContent = 'Save Profile ✓';
            }

            // Re-render countries to ensure they're visible
            const countryGrid = document.getElementById('country-grid');
            if (countryGrid) {
                countryGrid.innerHTML = COUNTRIES.map(c => `
                    <button class="country-btn" data-country="${c.code}">
                        <span class="country-flag">${c.flag}</span>
                        <span class="country-name">${c.name}</span>
                        <span class="country-board">${c.board}</span>
                    </button>
                `).join('');

                countryGrid.querySelectorAll('.country-btn').forEach(btn => {
                    btn.addEventListener('click', () => {
                        countryGrid.querySelectorAll('.country-btn').forEach(b => b.classList.remove('selected'));
                        btn.classList.add('selected');
                    });
                });
            }

            // Pre-select current values if available
            const profile = getStudentProfile();
            if (profile) {
                // Pre-select country
                setTimeout(() => {
                    const countryBtn = document.querySelector(`.country-btn[data-country="${profile.country}"]`);
                    if (countryBtn) countryBtn.classList.add('selected');
                }, 100);

                console.log("✏️ Editing profile for:", profile.email || profile.id);
            }

            // Re-attach event handlers for all Continue buttons in edit mode
            const skipBtn = document.getElementById('skip-onboarding');

            // Step 1 Continue
            const step1Continue = document.querySelector('.onboarding-step[data-step="1"] .onboarding-next');
            if (step1Continue) {
                step1Continue.onclick = () => {
                    console.log("✏️ Edit mode - Step 1 Continue, going to step 2");
                    document.querySelector('.onboarding-step[data-step="1"]')?.classList.remove('active');
                    document.querySelector('.onboarding-step[data-step="2"]')?.classList.add('active');
                    onboardingModal.dataset.currentStep = '2';
                    const progressBar = document.getElementById('onboarding-progress');
                    if (progressBar) progressBar.style.width = '40%';
                };
            }

            // Step 2 Continue & Back
            const step2Continue = document.querySelector('.onboarding-step[data-step="2"] .onboarding-next');
            const step2Back = document.querySelector('.onboarding-step[data-step="2"] .onboarding-back');
            if (step2Continue) {
                step2Continue.onclick = () => {
                    console.log("✏️ Edit mode - Step 2 Continue, going to step 3");
                    document.querySelector('.onboarding-step[data-step="2"]')?.classList.remove('active');
                    document.querySelector('.onboarding-step[data-step="3"]')?.classList.add('active');
                    onboardingModal.dataset.currentStep = '3';
                    const progressBar = document.getElementById('onboarding-progress');
                    if (progressBar) progressBar.style.width = '60%';

                    // Populate class grid based on selected education level
                    const selectedLevel = document.querySelector('.level-btn.selected')?.dataset.level || 'secondary';
                    updateStep3ForLevel(selectedLevel);

                    // Add click handlers for dynamically created buttons after a small delay
                    setTimeout(() => {
                        // Department buttons (for university levels)
                        document.querySelectorAll('.dept-btn').forEach(btn => {
                            btn.onclick = () => {
                                document.querySelectorAll('.dept-btn').forEach(b => b.classList.remove('selected'));
                                btn.classList.add('selected');
                            };
                        });
                        // Class buttons (for school levels)
                        document.querySelectorAll('.class-btn').forEach(btn => {
                            btn.onclick = () => {
                                document.querySelectorAll('.class-btn').forEach(b => b.classList.remove('selected'));
                                btn.classList.add('selected');
                            };
                        });
                    }, 50);
                };
            }
            if (step2Back) {
                step2Back.onclick = () => {
                    document.querySelector('.onboarding-step[data-step="2"]')?.classList.remove('active');
                    document.querySelector('.onboarding-step[data-step="1"]')?.classList.add('active');
                    onboardingModal.dataset.currentStep = '1';
                    const progressBar = document.getElementById('onboarding-progress');
                    if (progressBar) progressBar.style.width = '20%';
                };
            }

            // Step 3 Continue & Back
            const step3Continue = document.querySelector('.onboarding-step[data-step="3"] .onboarding-next');
            const step3Back = document.querySelector('.onboarding-step[data-step="3"] .onboarding-back');
            if (step3Continue) {
                step3Continue.onclick = () => {
                    console.log("✏️ Edit mode - Step 3 Continue, going to step 4");

                    // Get selected level to determine what step 4 shows
                    const selectedLevel = document.querySelector('.level-btn.selected')?.dataset.level;
                    const isUniversity = selectedLevel === 'undergraduate' || selectedLevel === 'postgraduate' || selectedLevel === 'doctoral';

                    // Update step 4 based on level
                    updateStep4ForLevel(selectedLevel);

                    // If university, populate programs for selected department
                    if (isUniversity) {
                        const selectedDept = document.querySelector('.dept-btn.selected')?.dataset.dept;
                        if (selectedDept) {
                            updateProgramsForDepartment(selectedDept);
                            // Re-add click handlers for the newly created buttons
                            setTimeout(() => {
                                document.querySelectorAll('.program-btn').forEach(btn => {
                                    btn.onclick = () => {
                                        document.querySelectorAll('.program-btn').forEach(b => b.classList.remove('selected'));
                                        btn.classList.add('selected');
                                    };
                                });
                                document.querySelectorAll('.year-btn').forEach(btn => {
                                    btn.onclick = () => {
                                        document.querySelectorAll('.year-btn').forEach(b => b.classList.remove('selected'));
                                        btn.classList.add('selected');
                                    };
                                });
                            }, 50);
                        }
                    } else {
                        // For non-university, add stream button handlers
                        setTimeout(() => {
                            document.querySelectorAll('.stream-btn').forEach(btn => {
                                btn.onclick = () => {
                                    document.querySelectorAll('.stream-btn').forEach(b => b.classList.remove('selected'));
                                    btn.classList.add('selected');
                                };
                            });
                        }, 50);
                    }

                    document.querySelector('.onboarding-step[data-step="3"]')?.classList.remove('active');
                    document.querySelector('.onboarding-step[data-step="4"]')?.classList.add('active');
                    onboardingModal.dataset.currentStep = '4';
                    const progressBar = document.getElementById('onboarding-progress');
                    if (progressBar) progressBar.style.width = '80%';
                };
            }
            if (step3Back) {
                step3Back.onclick = () => {
                    document.querySelector('.onboarding-step[data-step="3"]')?.classList.remove('active');
                    document.querySelector('.onboarding-step[data-step="2"]')?.classList.add('active');
                    onboardingModal.dataset.currentStep = '2';
                    const progressBar = document.getElementById('onboarding-progress');
                    if (progressBar) progressBar.style.width = '40%';
                };
            }

            // Step 4 Save Profile & Back
            const step4Save = document.querySelector('.onboarding-step[data-step="4"] .onboarding-next');
            const step4Back = document.querySelector('.onboarding-step[data-step="4"] .onboarding-back');
            if (step4Save) {
                step4Save.onclick = async () => {
                    console.log("✏️ Edit mode - Save Profile clicked");
                    // Collect and save profile
                    const selectedCountry = document.querySelector('.country-btn.selected')?.dataset.country || 'bangladesh';
                    const selectedLevel = document.querySelector('.level-btn.selected')?.dataset.level || 'secondary';
                    const selectedClass = document.querySelector('.class-btn.selected')?.dataset.class;
                    const selectedStream = document.querySelector('.stream-btn.selected')?.dataset.stream;
                    const selectedDept = document.querySelector('.dept-btn.selected')?.dataset.dept;
                    const selectedProgram = document.querySelector('.program-btn.selected')?.dataset.program;
                    const selectedYear = document.querySelector('.year-btn.selected')?.dataset.year;

                    const isUniversity = selectedLevel === 'undergraduate' || selectedLevel === 'postgraduate' || selectedLevel === 'doctoral';

                    // Get country info
                    const countryBtn = document.querySelector('.country-btn.selected');
                    const countryName = countryBtn?.querySelector('.country-name')?.textContent || 'Bangladesh';

                    // Start with basic profile info (not spreading existing to avoid old fields)
                    const existingProfile = getStudentProfile() || {};
                    const currentUser = getCurrentUser();
                    const updatedProfile = {
                        id: existingProfile.id || ('student_' + Date.now()),
                        email: existingProfile.email || currentUser?.email,
                        displayName: existingProfile.displayName || currentUser?.displayName,
                        userId: existingProfile.userId || currentUser?.uid,
                        createdAt: existingProfile.createdAt || new Date().toISOString(),
                        country: selectedCountry,
                        countryName: countryName,
                        educationLevel: selectedLevel,
                        type: isUniversity ? 'university' : 'school',
                        language: existingProfile.language || 'en-US'
                    };

                    if (isUniversity) {
                        // University student - save department, program, year
                        updatedProfile.department = selectedDept;
                        updatedProfile.program = selectedProgram;
                        updatedProfile.year = selectedYear;
                        // Get program name for display
                        const programBtn = document.querySelector('.program-btn.selected');
                        if (programBtn) {
                            updatedProfile.programName = programBtn.querySelector('.program-name')?.textContent || selectedProgram;
                        }
                        // Don't include class, stream, board for university students
                    } else {
                        // School student (Class 1-12) - save class, stream, board
                        updatedProfile.class = selectedClass || '10';
                        updatedProfile.stream = selectedStream || 'science';
                        // Get board from country data
                        const boardText = countryBtn?.querySelector('.country-board')?.textContent || 'NCTB';
                        updatedProfile.board = boardText;
                        // Don't include department, program, year for school students
                    }

                    // Get subjects based on profile type
                    if (isUniversity && selectedDept && selectedProgram) {
                        const prog = getUniversityProgram(selectedDept, selectedProgram);
                        updatedProfile.subjects = prog?.subjects || [];
                    } else if (!isUniversity) {
                        updatedProfile.subjects = getSubjectsForClass(selectedCountry, selectedClass || '10', selectedStream || 'science');
                    }

                    console.log("📝 Saving updated profile:", updatedProfile);
                    await saveStudentProfile(updatedProfile);

                    onboardingModal.dataset.editMode = 'false';
                    onboardingModal.classList.add('hidden');

                    // Re-show the user profile with updated data
                    showUserProfile();

                    addMessageToChat("✅ Profile updated successfully!", "system");
                };
            }
            if (step4Back) {
                step4Back.onclick = () => {
                    document.querySelector('.onboarding-step[data-step="4"]')?.classList.remove('active');
                    document.querySelector('.onboarding-step[data-step="3"]')?.classList.add('active');
                    onboardingModal.dataset.currentStep = '3';
                    const progressBar = document.getElementById('onboarding-progress');
                    if (progressBar) progressBar.style.width = '60%';
                };
            }

            // Add click handlers for level buttons
            document.querySelectorAll('.level-btn').forEach(btn => {
                btn.onclick = () => {
                    document.querySelectorAll('.level-btn').forEach(b => b.classList.remove('selected'));
                    btn.classList.add('selected');
                };
            });

            // Add click handlers for class buttons
            document.querySelectorAll('.class-btn').forEach(btn => {
                btn.onclick = () => {
                    document.querySelectorAll('.class-btn').forEach(b => b.classList.remove('selected'));
                    btn.classList.add('selected');
                };
            });

            // Add click handlers for department buttons
            document.querySelectorAll('.dept-btn').forEach(btn => {
                btn.onclick = () => {
                    document.querySelectorAll('.dept-btn').forEach(b => b.classList.remove('selected'));
                    btn.classList.add('selected');
                };
            });

            // Add click handlers for program buttons
            document.querySelectorAll('.program-btn').forEach(btn => {
                btn.onclick = () => {
                    document.querySelectorAll('.program-btn').forEach(b => b.classList.remove('selected'));
                    btn.classList.add('selected');
                };
            });

            // Add click handlers for year buttons
            document.querySelectorAll('.year-btn').forEach(btn => {
                btn.onclick = () => {
                    document.querySelectorAll('.year-btn').forEach(b => b.classList.remove('selected'));
                    btn.classList.add('selected');
                };
            });

            // Add click handlers for stream buttons
            document.querySelectorAll('.stream-btn').forEach(btn => {
                btn.onclick = () => {
                    document.querySelectorAll('.stream-btn').forEach(b => b.classList.remove('selected'));
                    btn.classList.add('selected');
                };
            });

            if (skipBtn) {
                skipBtn.onclick = () => {
                    console.log("✏️ Edit mode - Skip clicked, closing modal");
                    onboardingModal.dataset.editMode = 'false';
                    onboardingModal.classList.add('hidden');
                    addMessageToChat("✏️ Profile editing cancelled", "system");
                };
            }
        }

        addMessageToChat("✏️ Edit your profile details", "system");
    });

    // Link Account button - for local-only users to create account
    const linkAccountBtn = document.getElementById("link-account-btn");
    linkAccountBtn?.addEventListener("click", () => {
        // Close auth modal
        const authModal = document.getElementById("auth-modal");
        authModal?.classList.add("hidden");

        // Show onboarding at step 5 (account creation)
        const onboardingModal = document.getElementById("onboarding-modal");
        if (onboardingModal) {
            onboardingModal.classList.remove("hidden");

            // Hide all steps first
            document.querySelectorAll('.onboarding-step').forEach(step => step.classList.remove('active'));

            // Show step 5 (account creation)
            document.querySelector('.onboarding-step[data-step="5"]')?.classList.add('active');

            // Show progress bar at 100%
            document.getElementById('progress-container')?.classList.remove('hidden');
            const progressBar = document.getElementById('onboarding-progress');
            if (progressBar) progressBar.style.width = '100%';

            // Pre-fill name from local profile
            const profile = getStudentProfile();
            if (profile && profile.displayName) {
                const nameInput = document.getElementById('signup-fullname');
                if (nameInput) nameInput.value = profile.displayName;
            }
        }

        addMessageToChat("🔗 Create an account to sync your progress across devices!", "system");
    });

    // Close profile button
    const closeProfileBtn = document.getElementById("close-profile");
    closeProfileBtn?.addEventListener("click", () => {
        const userProfile = document.getElementById("user-profile");
        userProfile?.classList.add("hidden");
    });

    // ===========================================
    // CHAT HISTORY SIDEBAR EVENT LISTENERS
    // ===========================================

    // Toggle chat history sidebar
    elements.toggleHistorySidebarBtn?.addEventListener("click", () => {
        toggleChatHistorySidebar();
    });

    // Close chat history sidebar
    elements.closeHistorySidebarBtn?.addEventListener("click", () => {
        elements.chatHistorySidebar?.classList.add("hidden");
    });

    // New chat button
    elements.newChatBtn?.addEventListener("click", async () => {
        await startNewChat();
    });

    // Search chats
    elements.chatSearchInput?.addEventListener("input", (e) => {
        filterChatHistory(e.target.value);
    });

    // History login button
    elements.historyLoginBtn?.addEventListener("click", () => {
        elements.chatHistorySidebar?.classList.add("hidden");
        showLoginForm();
    });
}

// ===========================================
// Mode Management
// ===========================================
function setMode(mode) {
    currentMode = mode;

    // Update UI
    document.querySelectorAll(".mode-btn").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.mode === mode);
    });

    // Show/hide file upload based on mode
    const fileUploadArea = document.getElementById("file-upload-area");
    if (fileUploadArea) {
        fileUploadArea.classList.toggle("visible", mode === 'file');
    }

    console.log(`📍 Mode changed to: ${mode}`);
}

// ===========================================
// Chat History Functions (Professional Like Claude/ChatGPT)
// ===========================================

// Cache for chat history
let chatHistoryCache = [];
let currentChatMessages = [];

// Toggle chat history sidebar
function toggleChatHistorySidebar() {
    const sidebar = elements.chatHistorySidebar;
    if (!sidebar) return;

    const isHidden = sidebar.classList.contains("hidden");

    if (isHidden) {
        sidebar.classList.remove("hidden");
        refreshChatHistory();
    } else {
        sidebar.classList.add("hidden");
    }
}

// Refresh chat history from Firebase
async function refreshChatHistory() {
    const user = getCurrentUser();

    if (!user) {
        // Show login prompt
        elements.chatHistoryList.innerHTML = '';
        elements.historyLoginPrompt?.classList.remove("hidden");
        return;
    }

    elements.historyLoginPrompt?.classList.add("hidden");

    // Show loading
    elements.chatHistoryList.innerHTML = `
        <div class="history-loading">
            <div class="loading-spinner small"></div>
            <span>Loading chats...</span>
        </div>
    `;

    try {
        const chats = await loadChatHistory(50);
        chatHistoryCache = chats;
        renderChatHistory(chats);
    } catch (error) {
        console.error("Error loading chat history:", error);
        elements.chatHistoryList.innerHTML = `
            <div class="history-empty">
                <span class="history-empty-icon">⚠️</span>
                <p>Failed to load chats</p>
            </div>
        `;
    }
}

// Render chat history list
function renderChatHistory(chats) {
    if (!chats || chats.length === 0) {
        elements.chatHistoryList.innerHTML = `
            <div class="history-empty">
                <span class="history-empty-icon">💬</span>
                <p>No conversations yet.<br>Start chatting to save history!</p>
            </div>
        `;
        return;
    }

    // Group chats by date
    const grouped = groupChatsByDate(chats);
    let html = '';

    for (const [dateLabel, dateChats] of Object.entries(grouped)) {
        html += `<div class="history-date-divider">${dateLabel}</div>`;

        for (const chat of dateChats) {
            const isActive = getCurrentChatId() === chat.id;
            const modeIcon = getModeIcon(chat.mode);
            const timeAgo = getTimeAgo(chat.updatedAt);

            html += `
                <div class="chat-history-item ${isActive ? 'active' : ''}" data-chat-id="${chat.id}">
                    <span class="chat-item-icon">${modeIcon}</span>
                    <div class="chat-item-content">
                        <div class="chat-item-title">${escapeHtml(chat.title)}</div>
                        <div class="chat-item-meta">${chat.messageCount} messages · ${timeAgo}</div>
                    </div>
                    <div class="chat-item-actions">
                        <button class="chat-action-btn rename" title="Rename" data-chat-id="${chat.id}">✏️</button>
                        <button class="chat-action-btn delete" title="Delete" data-chat-id="${chat.id}">🗑️</button>
                    </div>
                </div>
            `;
        }
    }

    elements.chatHistoryList.innerHTML = html;

    // Add click listeners
    document.querySelectorAll('.chat-history-item').forEach(item => {
        item.addEventListener('click', (e) => {
            // Don't load if clicking action buttons
            if (e.target.closest('.chat-action-btn')) return;
            loadChatFromHistory(item.dataset.chatId);
        });
    });

    // Add rename listeners
    document.querySelectorAll('.chat-action-btn.rename').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            showRenameDialog(btn.dataset.chatId);
        });
    });

    // Add delete listeners
    document.querySelectorAll('.chat-action-btn.delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            confirmDeleteChat(btn.dataset.chatId);
        });
    });
}

// Group chats by date
function groupChatsByDate(chats) {
    const groups = {
        'Today': [],
        'Yesterday': [],
        'Previous 7 Days': [],
        'Previous 30 Days': [],
        'Older': []
    };

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(today);
    monthAgo.setDate(monthAgo.getDate() - 30);

    for (const chat of chats) {
        const chatDate = new Date(chat.updatedAt);

        if (chatDate >= today) {
            groups['Today'].push(chat);
        } else if (chatDate >= yesterday) {
            groups['Yesterday'].push(chat);
        } else if (chatDate >= weekAgo) {
            groups['Previous 7 Days'].push(chat);
        } else if (chatDate >= monthAgo) {
            groups['Previous 30 Days'].push(chat);
        } else {
            groups['Older'].push(chat);
        }
    }

    // Remove empty groups
    const result = {};
    for (const [key, value] of Object.entries(groups)) {
        if (value.length > 0) {
            result[key] = value;
        }
    }

    return result;
}

// Get mode icon
function getModeIcon(mode) {
    const icons = {
        'chat': '💬',
        'curriculum': '📚',
        'file': '📄',
        'research': '🔬'
    };
    return icons[mode] || '💬';
}

// Get time ago string
function getTimeAgo(date) {
    const now = new Date();
    const diff = now - new Date(date);
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(date).toLocaleDateString();
}

// Load chat from history
async function loadChatFromHistory(chatId) {
    try {
        const chat = await loadChat(chatId);
        if (!chat) {
            addMessageToChat("⚠️ Could not load chat", "system");
            return;
        }

        // Set current chat ID
        setCurrentChatId(chatId);

        // Clear current messages
        elements.chatMessages.innerHTML = '';
        conversationHistory = [];
        currentChatMessages = [];

        // Set mode
        if (chat.mode) {
            setMode(chat.mode);
        }

        // Restore messages
        if (chat.messages && Array.isArray(chat.messages)) {
            for (const msg of chat.messages) {
                const role = msg.role === 'user' ? 'user' : 'teacher';
                const content = msg.content || msg.parts?.[0]?.text || '';

                // Check if it's an image message
                if (msg.type === 'image' && msg.imageData) {
                    // Display saved image
                    const messageDiv = document.createElement("div");
                    messageDiv.className = "message teacher";
                    messageDiv.innerHTML = `
                        <div class="message-content">
                            <p>🎨 ${msg.content || 'Generated educational image'}</p>
                            <img src="data:${msg.mimeType || 'image/png'};base64,${msg.imageData}" 
                                 alt="Generated educational image" 
                                 style="max-width: 100%; border-radius: 12px; margin-top: 10px;">
                        </div>
                    `;
                    elements.chatMessages.appendChild(messageDiv);
                    currentChatMessages.push(msg);
                }
                // Check if it's a quiz message
                else if (msg.type === 'quiz' && msg.quizData) {
                    // Display saved quiz questions
                    const messageDiv = document.createElement("div");
                    messageDiv.className = "message teacher";
                    let quizHtml = `<div class="message-content"><p>📝 <strong>Quiz: ${msg.quizData.subject}</strong> (${msg.quizData.count} questions)</p>`;
                    msg.quizData.questions?.forEach((q, i) => {
                        quizHtml += `<p><strong>Q${i + 1}.</strong> ${q.question}</p>`;
                        q.options?.forEach((opt, j) => {
                            const letter = String.fromCharCode(65 + j);
                            quizHtml += `<p style="margin-left: 15px;">${letter}) ${opt.replace(/^[A-D]\)\s*/i, '')}</p>`;
                        });
                    });
                    quizHtml += '</div>';
                    messageDiv.innerHTML = quizHtml;
                    elements.chatMessages.appendChild(messageDiv);
                    currentChatMessages.push(msg);
                }
                // Check if it's a quiz result message
                else if (msg.type === 'quiz_result' && msg.quizResult) {
                    // Display saved quiz result
                    const r = msg.quizResult;
                    const messageDiv = document.createElement("div");
                    messageDiv.className = "message teacher";
                    messageDiv.innerHTML = `
                        <div class="message-content">
                            <p>📊 <strong>Quiz Result: ${r.subject}</strong></p>
                            <p>Score: ${r.score}/${r.total} (${r.percentage}%)</p>
                            <p>Grade: <strong>${r.grade}</strong> | Time: ${r.time}</p>
                        </div>
                    `;
                    elements.chatMessages.appendChild(messageDiv);
                    currentChatMessages.push(msg);
                }
                else if (content) {
                    addMessageToChat(content, role, false);
                    conversationHistory.push({
                        role: msg.role,
                        content: content
                    });
                    currentChatMessages.push(msg);
                }
            }
        }

        // Scroll to bottom
        elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;

        // Update sidebar to show active chat
        document.querySelectorAll('.chat-history-item').forEach(item => {
            item.classList.toggle('active', item.dataset.chatId === chatId);
        });

        // Close sidebar on mobile
        if (window.innerWidth < 768) {
            elements.chatHistorySidebar?.classList.add("hidden");
        }

        console.log(`✅ Loaded chat: ${chat.title}`);

    } catch (error) {
        console.error("Error loading chat:", error);
        addMessageToChat("⚠️ Error loading chat", "system");
    }
}

// Start new chat
async function startNewChat() {
    // Save current chat if it has messages
    if (currentChatMessages.length > 0 && getCurrentUser()) {
        const currentId = getCurrentChatId();
        if (currentId) {
            await updateChatHistory(currentId, currentChatMessages);
        } else {
            await saveChatHistory(currentMode, currentChatMessages);
        }
    }

    // Reset state
    setCurrentChatId(null);
    conversationHistory = [];
    currentChatMessages = [];

    // Clear chat UI
    elements.chatMessages.innerHTML = `
        <div class="welcome-message">
            <div class="welcome-avatar">👋</div>
            <h3>New Conversation</h3>
            <p>Ask me anything about your studies. I'm here to help you learn!</p>
        </div>
    `;

    // Update sidebar
    document.querySelectorAll('.chat-history-item').forEach(item => {
        item.classList.remove('active');
    });

    // Close sidebar on mobile
    if (window.innerWidth < 768) {
        elements.chatHistorySidebar?.classList.add("hidden");
    }

    console.log("✨ Started new chat");
}

// Filter chat history by search
function filterChatHistory(query) {
    if (!query.trim()) {
        renderChatHistory(chatHistoryCache);
        return;
    }

    const filtered = chatHistoryCache.filter(chat =>
        chat.title.toLowerCase().includes(query.toLowerCase())
    );

    renderChatHistory(filtered);
}

// Show rename dialog
function showRenameDialog(chatId) {
    const chat = chatHistoryCache.find(c => c.id === chatId);
    if (!chat) return;

    // Create dialog
    const dialog = document.createElement('div');
    dialog.className = 'rename-dialog';
    dialog.innerHTML = `
        <div class="rename-dialog-content">
            <h4>Rename Chat</h4>
            <input type="text" id="rename-input" value="${escapeHtml(chat.title)}" maxlength="100">
            <div class="rename-dialog-actions">
                <button class="btn secondary" id="rename-cancel">Cancel</button>
                <button class="btn primary" id="rename-save">Save</button>
            </div>
        </div>
    `;

    document.body.appendChild(dialog);

    // Show dialog with animation
    setTimeout(() => dialog.classList.add('visible'), 10);

    // Focus input
    const input = document.getElementById('rename-input');
    input?.focus();
    input?.select();

    // Save handler
    const saveHandler = async () => {
        const newTitle = input?.value.trim();
        if (newTitle && newTitle !== chat.title) {
            const result = await renameChat(chatId, newTitle);
            if (result.success) {
                // Update cache
                const cacheChat = chatHistoryCache.find(c => c.id === chatId);
                if (cacheChat) cacheChat.title = newTitle;
                renderChatHistory(chatHistoryCache);
            }
        }
        closeDialog();
    };

    // Close handler
    const closeDialog = () => {
        dialog.classList.remove('visible');
        setTimeout(() => dialog.remove(), 300);
    };

    // Event listeners
    document.getElementById('rename-save')?.addEventListener('click', saveHandler);
    document.getElementById('rename-cancel')?.addEventListener('click', closeDialog);
    input?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') saveHandler();
        if (e.key === 'Escape') closeDialog();
    });
    dialog.addEventListener('click', (e) => {
        if (e.target === dialog) closeDialog();
    });
}

// Confirm delete chat
function confirmDeleteChat(chatId) {
    const chat = chatHistoryCache.find(c => c.id === chatId);
    if (!chat) return;

    if (confirm(`Delete "${chat.title}"?\n\nThis action cannot be undone.`)) {
        performDeleteChat(chatId);
    }
}

// Perform delete chat
async function performDeleteChat(chatId) {
    const result = await deleteChat(chatId);

    if (result.success) {
        // Remove from cache
        chatHistoryCache = chatHistoryCache.filter(c => c.id !== chatId);
        renderChatHistory(chatHistoryCache);

        // If we deleted the current chat, start new
        if (getCurrentChatId() === chatId) {
            await startNewChat();
        }

        addMessageToChat("🗑️ Chat deleted", "system");
    } else {
        addMessageToChat(`⚠️ Failed to delete: ${result.error}`, "system");
    }
}

// Auto-save chat after each message
// Only saves when there's a real conversation (at least 1 user + 1 teacher message)
async function autoSaveChat() {
    const user = getCurrentUser();
    if (!user) return;


    if (currentChatMessages.length === 0) return;

    // Check if we have a real conversation (at least 1 user message AND 1 model reply)
    const hasUserMessage = currentChatMessages.some(msg => msg.role === 'user');
    const hasModelReply = currentChatMessages.some(msg => msg.role === 'model');


    if (!hasUserMessage || !hasModelReply) {
        console.log("📝 Skipping save - need both user message and teacher reply");
        return;
    }

    try {
        const currentId = getCurrentChatId();
        if (currentId) {

            await updateChatHistory(currentId, currentChatMessages);
        } else {
            // Save as new chat
            const result = await saveChatHistory(currentMode, currentChatMessages);
            if (result.success) {
                setCurrentChatId(result.chatId);

                refreshChatHistory();
            }
        }
    } catch (error) {
        console.error("Auto-save error:", error);
    }
}


window.toggleChatHistorySidebar = toggleChatHistorySidebar;
window.refreshChatHistory = refreshChatHistory;
window.startNewChat = startNewChat;

// ===========================================


async function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    // Show file preview with uploading status
    const preview = document.getElementById("file-preview");
    if (preview) {
        preview.innerHTML = `
            <div class="file-info">
                <span class="file-icon">📄</span>
                <span class="file-name">${file.name}</span>
                <span class="file-size">${(file.size / 1024).toFixed(1)} KB</span>
                <span class="upload-status">⏳ Uploading...</span>
                <button class="remove-file-btn" onclick="removeUploadedFile()">✕</button>
            </div>
        `;
        preview.classList.add("visible");
    }

    uploadedFile = file;

    try {
        // If Live mode is active and it's an image, send directly to Live session
        if (isLiveSessionActive && liveChatController && file.type.startsWith('image/')) {
            const base64Data = await fileToBase64(file);
            const base64Only = base64Data.data; // Get just the base64 part

            // Send to Live session with prompt
            sendLiveImage(base64Only, file.type, `Please analyze this image: ${file.name}`);

            // Update preview
            if (preview) {
                const statusEl = preview.querySelector('.upload-status');
                if (statusEl) {
                    statusEl.textContent = '✅ Sent to Live';
                    statusEl.style.color = '#22c55e';
                }
            }

            addMessageToChat(`📷 Image sent for live analysis: ${file.name}`, "user");
            return;
        }


        if (file.size < 4 * 1024 * 1024) {
            // Small file - use base64 inline
            uploadedFileData = await fileToBase64(file);
            uploadedFileUri = null;
            console.log("📄 Small file - using inline base64");
        } else {

            console.log("📤 Large file - uploading to Gemini Files API...");
            const fileUri = await uploadToGeminiFilesAPI(file);
            uploadedFileUri = fileUri;
            uploadedFileData = { mimeType: file.type, data: null };
            console.log("✅ File uploaded to Gemini:", fileUri);
        }

        // Update preview to show success
        if (preview) {
            const statusEl = preview.querySelector('.upload-status');
            if (statusEl) {
                statusEl.textContent = '✅ Ready';
                statusEl.style.color = '#22c55e';
            }
        }

        setMode('file');
        addMessageToChat(`📄 File uploaded: ${file.name}. Ask me anything about it!`, "system");
    } catch (error) {
        console.error("Error processing file:", error);
        if (preview) {
            const statusEl = preview.querySelector('.upload-status');
            if (statusEl) {
                statusEl.textContent = '❌ Failed';
                statusEl.style.color = '#ef4444';
            }
        }
        addMessageToChat("❌ Error processing file. Please try again.", "system");
    }
}


async function uploadToGeminiFilesAPI(file) {
    // Note: File uploads must use direct API even in production due to multipart requirements
    // This is acceptable as the key is only used server-side
    const apiKey = CONFIG.geminiApiKey;

    const startUploadUrl = `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`;

    const metadata = {
        file: {
            displayName: file.name
        }
    };

    // For resumable upload, we need to initiate first
    const initResponse = await fetch(startUploadUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Goog-Upload-Protocol': 'resumable',
            'X-Goog-Upload-Command': 'start',
            'X-Goog-Upload-Header-Content-Length': file.size.toString(),
            'X-Goog-Upload-Header-Content-Type': file.type
        },
        body: JSON.stringify(metadata)
    });

    if (!initResponse.ok) {

        return await simpleFileUpload(file, apiKey);
    }

    const uploadUrl = initResponse.headers.get('X-Goog-Upload-URL');

    if (!uploadUrl) {

        return await simpleFileUpload(file, apiKey);
    }

    // Step 2: Upload file data
    const arrayBuffer = await file.arrayBuffer();
    const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
            'Content-Length': file.size.toString(),
            'X-Goog-Upload-Offset': '0',
            'X-Goog-Upload-Command': 'upload, finalize'
        },
        body: arrayBuffer
    });

    if (!uploadResponse.ok) {
        throw new Error(`Upload failed: ${uploadResponse.status}`);
    }

    const result = await uploadResponse.json();
    return result.file.uri;
}


async function simpleFileUpload(file, apiKey) {
    const uploadUrl = `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`;

    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`File upload failed: ${errorText}`);
    }

    const result = await response.json();
    return result.file.uri;
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const base64 = reader.result.split(',')[1];
            resolve({
                mimeType: file.type,
                data: base64
            });
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function removeUploadedFile() {
    uploadedFile = null;
    uploadedFileData = null;
    uploadedFileUri = null;
    const preview = document.getElementById("file-preview");
    if (preview) {
        preview.classList.remove("visible");
        preview.innerHTML = "";
    }
    const fileInput = document.getElementById("file-input");
    if (fileInput) fileInput.value = "";
}
window.removeUploadedFile = removeUploadedFile;


// Progress Panel

function toggleProgressPanel() {
    const panel = document.getElementById('progress-panel');
    if (panel) {
        panel.classList.toggle('visible');
        if (panel.classList.contains('visible')) {
            updateProgressPanel();
        }
    }
}

function updateProgressPanel() {
    const summary = progressTracker.getProgressSummary();
    const panel = document.getElementById('progress-content');
    if (!panel) return;

    panel.innerHTML = `
        <div class="progress-stats">
            <div class="stat-item">
                <span class="stat-value">${summary.totalInteractions}</span>
                <span class="stat-label">Interactions</span>
            </div>
            <div class="stat-item">
                <span class="stat-value">${summary.accuracy}%</span>
                <span class="stat-label">Accuracy</span>
            </div>
            <div class="stat-item">
                <span class="stat-value">${summary.masteryLevel.icon}</span>
                <span class="stat-label">${summary.masteryLevel.label}</span>
            </div>
        </div>
        
        <h4>📚 Subjects</h4>
        <div class="subject-list">
            ${summary.subjects.map(s => `
                <div class="subject-item">
                    <span class="subject-name">${s.name}</span>
                    <div class="progress-bar-container">
                        <div class="progress-bar-fill" style="width: ${s.mastery * 100}%; background: ${s.level.color}"></div>
                    </div>
                    <span class="subject-level">${s.level.icon} ${Math.round(s.mastery * 100)}%</span>
                </div>
            `).join('')}
        </div>
        
        ${summary.weakAreas.length > 0 ? `
        <h4>⚠️ Needs Practice</h4>
        <div class="weak-areas">
            ${summary.weakAreas.map(w => `
                <span class="weak-topic">${w.subject}: ${w.topic}</span>
            `).join('')}
        </div>
        ` : ''}
    `;
}


// Textbook Library System

const TEXTBOOK_CACHE_KEY = 'intella_textbook_cache';

let libraryTextbooks = [];
let currentLibraryTab = 'my-books';
let selectedTextbook = null;
let pendingUploadFile = null;

// Textbook cache helper functions
function getTextbookCache() {
    try {
        const cache = localStorage.getItem(TEXTBOOK_CACHE_KEY);
        return cache ? JSON.parse(cache) : {};
    } catch (e) {
        console.error('Error reading textbook cache:', e);
        return {};
    }
}

function saveTextbookToCache(bookId, book, chapters) {
    try {
        const cache = getTextbookCache();
        cache[bookId] = {
            book: book,
            chapters: chapters,
            cachedAt: Date.now()
        };
        localStorage.setItem(TEXTBOOK_CACHE_KEY, JSON.stringify(cache));
        console.log(`📚 Cached textbook: ${book.title || book.subject}`);
    } catch (e) {
        console.error('Error saving textbook to cache:', e);
    }
}

function getCachedTextbook(bookId) {
    const cache = getTextbookCache();
    const cached = cache[bookId];
    // Cache valid for 30 days
    if (cached && (Date.now() - cached.cachedAt < 30 * 24 * 60 * 60 * 1000)) {
        console.log(`⚡ Using cached textbook: ${cached.book.title || cached.book.subject}`);
        return cached;
    }
    return null;
}

// Standard subjects for each stream
const STANDARD_SUBJECTS = {
    science: ['bangla', 'english', 'mathematics', 'physics', 'chemistry', 'biology', 'ict', 'higher-math'],
    commerce: ['bangla', 'english', 'mathematics', 'accounting', 'economics', 'business', 'ict'],
    arts: ['bangla', 'english', 'history', 'geography', 'civics', 'economics', 'ict'],
    general: ['bangla', 'english', 'mathematics', 'science', 'social-science', 'religion', 'agriculture']
};


const SUBJECT_NAMES = {
    'bangla': { bn: 'বাংলা', en: 'Bangla', icon: '📖' },
    'english': { bn: 'ইংরেজি', en: 'English', icon: '📗' },
    'mathematics': { bn: 'গণিত', en: 'Mathematics', icon: '🔢' },
    'physics': { bn: 'পদার্থবিজ্ঞান', en: 'Physics', icon: '⚛️' },
    'chemistry': { bn: 'রসায়ন', en: 'Chemistry', icon: '🧪' },
    'biology': { bn: 'জীববিজ্ঞান', en: 'Biology', icon: '🧬' },
    'ict': { bn: 'তথ্য ও যোগাযোগ প্রযুক্তি', en: 'ICT', icon: '💻' },
    'higher-math': { bn: 'উচ্চতর গণিত', en: 'Higher Math', icon: '📐' },
    'accounting': { bn: 'হিসাববিজ্ঞান', en: 'Accounting', icon: '📊' },
    'economics': { bn: 'অর্থনীতি', en: 'Economics', icon: '💰' },
    'business': { bn: 'ব্যবসায় সংগঠন', en: 'Business Studies', icon: '🏢' },
    'history': { bn: 'ইতিহাস', en: 'History', icon: '📜' },
    'geography': { bn: 'ভূগোল', en: 'Geography', icon: '🌍' },
    'civics': { bn: 'পৌরনীতি', en: 'Civics', icon: '🏛️' },
    'science': { bn: 'বিজ্ঞান', en: 'Science', icon: '🔬' },
    'social-science': { bn: 'সমাজবিজ্ঞান', en: 'Social Science', icon: '👥' },
    'religion': { bn: 'ধর্ম', en: 'Religion', icon: '🙏' },
    'agriculture': { bn: 'কৃষিশিক্ষা', en: 'Agriculture', icon: '🌾' },
    'other': { bn: 'অন্যান্য', en: 'Other', icon: '📚' }
};


function openLibraryModal() {
    const modal = document.getElementById('library-modal');
    if (modal) {
        modal.classList.remove('hidden');
        updateLibraryStudentInfo();
        loadLibraryBooks();
    }
}

// Close library modal
function closeLibraryModal() {
    const modal = document.getElementById('library-modal');
    if (modal) {
        modal.classList.add('hidden');
    }

    hideUploadForm();
}


function updateLibraryStudentInfo() {
    const classEl = document.getElementById('library-student-class');
    const streamEl = document.getElementById('library-student-stream');
    const boardEl = document.getElementById('library-student-board');

    const profile = getStudentProfile();
    console.log("📚 Updating library info for profile:", profile);

    if (profile) {
        const isUniversity = profile.type === 'university' ||
            profile.educationLevel === 'undergraduate' ||
            profile.educationLevel === 'postgraduate' ||
            profile.educationLevel === 'doctoral';

        if (isUniversity) {
            // University student - show program and year
            const programDisplay = profile.programName ||
                (profile.program ? profile.program.toUpperCase() : 'University');
            if (classEl) classEl.textContent = programDisplay;
            if (streamEl) streamEl.textContent = `Year ${profile.year || 1}`;
            if (boardEl) boardEl.textContent = profile.department ?
                profile.department.charAt(0).toUpperCase() + profile.department.slice(1) : '';
        } else {
            // School student - show class, stream, board
            if (classEl) classEl.textContent = `Class ${profile.class || 10}`;
            if (streamEl) streamEl.textContent = profile.stream ?
                profile.stream.charAt(0).toUpperCase() + profile.stream.slice(1) : 'Science';
            if (boardEl) boardEl.textContent = profile.board || 'NCTB';
        }
    }
}

// Load books for library
async function loadLibraryBooks() {
    const grid = document.getElementById('library-books-grid');
    if (!grid) return;

    // Get fresh profile
    const profile = getStudentProfile();

    grid.innerHTML = `
        <div class="library-loading">
            <div class="loading-spinner"></div>
            <span>Loading textbooks...</span>
        </div>
    `;

    const isUniversity = profile?.type === 'university' ||
        profile?.educationLevel === 'undergraduate' ||
        profile?.educationLevel === 'postgraduate' ||
        profile?.educationLevel === 'doctoral';

    let textbooks = [];

    if (isUniversity) {
        // University student - just get all uploaded books for their department/program
        try {
            textbooks = await getTextbooks({
                department: profile?.department,
                program: profile?.program
            });
        } catch (e) {
            textbooks = [];
        }

        // For university: show uploaded books only, with upload button
        libraryTextbooks = textbooks || [];

        if (textbooks.length === 0) {
            grid.innerHTML = `
                <div class="library-empty-university">
                    <span class="empty-icon">📚</span>
                    <h3>No books uploaded yet</h3>
                    <p>Upload your course materials to share with others</p>
                    <button class="upload-book-btn" onclick="showUploadForm()">
                        📤 Upload a Book
                    </button>
                </div>
            `;
        } else {
            grid.innerHTML = `
                <div class="university-upload-header">
                    <button class="upload-book-btn" onclick="showUploadForm()">📤 Upload New Book</button>
                </div>
            ` + textbooks.map(book => {
                return `
                    <div class="book-card available" data-book-id="${book.id}" onclick="openBook('${book.id}')">
                        <span class="book-icon">📖</span>
                        <span class="book-title">${book.title || book.subject}<br><small>${book.subject}</small></span>
                        <span class="book-chapters">${book.chaptersCount || 0} chapters</span>
                    </div>
                `;
            }).join('');
        }
    } else {
        // School student - show predefined subjects
        const classNum = profile?.class || 10;
        const stream = profile?.stream || 'science';
        const expectedSubjects = STANDARD_SUBJECTS[stream] || STANDARD_SUBJECTS.general;
        textbooks = await getTextbooks({ classNum, stream });

        libraryTextbooks = textbooks || [];

        const availableBooks = new Map();
        (textbooks || []).forEach(book => {
            availableBooks.set(book.subject, book);
        });

        // Render grid for school students
        if (currentLibraryTab === 'my-books') {
            grid.innerHTML = expectedSubjects.map(subject => {
                const book = availableBooks.get(subject);
                const subjectInfo = SUBJECT_NAMES[subject] || { icon: '📖', bn: subject, en: subject };

                if (book) {
                    return `
                        <div class="book-card available" data-book-id="${book.id}" onclick="openBook('${book.id}')">
                            <span class="book-icon">${subjectInfo.icon}</span>
                            <span class="book-title">${subjectInfo.bn}<br><small>${subjectInfo.en}</small></span>
                            <span class="book-chapters">${book.chaptersCount || 0} chapters</span>
                        </div>
                    `;
                } else {
                    return `
                        <div class="book-card missing" data-subject="${subject}" onclick="promptUpload('${subject}')">
                            <span class="book-icon">${subjectInfo.icon}</span>
                            <span class="book-title">${subjectInfo.bn}<br><small>${subjectInfo.en}</small></span>
                            <span class="book-chapters">📤 Upload</span>
                        </div>
                    `;
                }
            }).join('');
        } else {
            // All books tab for school
            if (textbooks.length === 0) {
                grid.innerHTML = `
                    <div class="library-loading">
                        <span>📚 No textbooks uploaded yet</span>
                        <p style="font-size: 0.85rem; margin-top: 8px;">Be the first to upload!</p>
                    </div>
                `;
            } else {
                grid.innerHTML = textbooks.map(book => {
                    const subjectInfo = SUBJECT_NAMES[book.subject] || SUBJECT_NAMES.other;
                    return `
                        <div class="book-card available" data-book-id="${book.id}" onclick="openBook('${book.id}')">
                            <span class="book-icon">${subjectInfo.icon}</span>
                            <span class="book-title">${book.title || subjectInfo.bn}<br><small>Class ${book.class}</small></span>
                            <span class="book-chapters">${book.chaptersCount || 0} chapters</span>
                        </div>
                    `;
                }).join('');
            }
        }
    }
}

// Switch library tab
function switchLibraryTab(tab) {
    currentLibraryTab = tab;


    document.querySelectorAll('.library-tab').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });


    loadLibraryBooks();
}

// Prompt to upload a specific subject
function promptUpload(subject) {
    const subjectInfo = SUBJECT_NAMES[subject] || SUBJECT_NAMES.other;


    const titleInput = document.getElementById('upload-book-title');
    const subjectSelect = document.getElementById('upload-book-subject');
    const classSelect = document.getElementById('upload-book-class');
    const streamSelect = document.getElementById('upload-book-stream');

    if (titleInput) titleInput.value = subjectInfo.bn;
    if (subjectSelect) subjectSelect.value = subject;
    if (classSelect) classSelect.value = studentProfile?.class || 10;
    if (streamSelect) streamSelect.value = studentProfile?.stream || '';


    const fileInput = document.getElementById('library-file-input');
    if (fileInput) fileInput.click();
}

// Handle library file selection
function handleLibraryFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
        addMessageToChat("❌ Please select a PDF file", "system");
        return;
    }

    pendingUploadFile = file;
    showUploadForm();
}


function showUploadForm() {
    // First, trigger file selection if no file is pending
    if (!pendingUploadFile) {
        const fileInput = document.getElementById('library-file-input');
        if (fileInput) {
            fileInput.click();
        }
        return;
    }

    const uploadSection = document.querySelector('.library-upload-section');
    const uploadForm = document.getElementById('library-upload-form');

    if (uploadSection) uploadSection.classList.add('hidden');
    if (uploadForm) uploadForm.classList.remove('hidden');

    // Customize form based on user type
    const profile = getStudentProfile();
    const isUniversity = profile?.type === 'university' ||
        profile?.educationLevel === 'undergraduate' ||
        profile?.educationLevel === 'postgraduate' ||
        profile?.educationLevel === 'doctoral';

    const classGroup = document.getElementById('upload-book-class')?.parentElement;
    const streamGroup = document.getElementById('upload-book-stream')?.parentElement;
    const subjectSelect = document.getElementById('upload-book-subject');

    if (isUniversity) {
        // Hide class and stream for university students
        if (classGroup) classGroup.style.display = 'none';
        if (streamGroup) streamGroup.style.display = 'none';

        // Change subject dropdown to text input for university
        if (subjectSelect) {
            const subjectGroup = subjectSelect.parentElement;
            subjectGroup.innerHTML = `
                <label>Subject/Course Name</label>
                <input type="text" id="upload-book-subject" placeholder="e.g., Data Structures, Operating Systems">
            `;
        }
    } else {
        // Show class and stream for school students
        if (classGroup) classGroup.style.display = 'block';
        if (streamGroup) streamGroup.style.display = 'block';
    }
}


function hideUploadForm() {
    const uploadSection = document.querySelector('.library-upload-section');
    const uploadForm = document.getElementById('library-upload-form');

    if (uploadSection) uploadSection.classList.remove('hidden');
    if (uploadForm) uploadForm.classList.add('hidden');

    pendingUploadFile = null;

    // Reset form
    const fileInput = document.getElementById('library-file-input');
    if (fileInput) fileInput.value = '';
}


async function confirmUpload() {
    if (!pendingUploadFile) {
        addMessageToChat("❌ Please select a file first", "system");
        return;
    }

    const profile = getStudentProfile();
    const isUniversity = profile?.type === 'university' ||
        profile?.educationLevel === 'undergraduate' ||
        profile?.educationLevel === 'postgraduate' ||
        profile?.educationLevel === 'doctoral';

    const title = document.getElementById('upload-book-title')?.value.trim();
    const subjectEl = document.getElementById('upload-book-subject');
    const subject = subjectEl?.value?.trim() || subjectEl?.options?.[subjectEl.selectedIndex]?.value;

    if (!title || !subject) {
        addMessageToChat("❌ Please fill in title and subject", "system");
        return;
    }

    let uploadData;

    if (isUniversity) {
        // University upload
        uploadData = {
            title,
            subject,
            type: 'university',
            department: profile?.department,
            program: profile?.program,
            country: profile?.country || 'bangladesh'
        };

        // Check for duplicate - same subject for same program
        const exists = await checkUniversityTextbookExists(profile?.department, profile?.program, subject);
        if (exists) {
            addMessageToChat(`📚 A book for "${subject}" already exists!`, "system");
            hideUploadForm();
            return;
        }
    } else {
        // School upload
        const classNum = document.getElementById('upload-book-class')?.value;
        const stream = document.getElementById('upload-book-stream')?.value;

        if (!classNum) {
            addMessageToChat("❌ Please select a class", "system");
            return;
        }

        uploadData = {
            title,
            subject,
            class: classNum,
            stream,
            board: profile?.board || 'NCTB',
            country: profile?.country || 'bangladesh'
        };

        // Check for duplicate
        const exists = await checkTextbookExists(classNum, subject);
        if (exists) {
            addMessageToChat(`📚 ${title} for Class ${classNum} already exists in the library!`, "system");
            hideUploadForm();
            return;
        }
    }

    // Show progress
    const progressDiv = document.getElementById('upload-progress');
    const progressFill = document.getElementById('upload-progress-fill');
    const progressText = document.getElementById('upload-progress-text');

    if (progressDiv) progressDiv.classList.remove('hidden');
    if (progressFill) progressFill.style.width = '30%';
    if (progressText) progressText.textContent = 'Uploading PDF to cloud...';

    const fileForExtraction = pendingUploadFile;

    const result = await uploadTextbook(pendingUploadFile, uploadData);

    if (!result.success) {
        addMessageToChat(`❌ Upload failed: ${result.error}`, "system");
        if (progressDiv) progressDiv.classList.add('hidden');
        return;
    }

    // Show success immediately
    if (progressFill) progressFill.style.width = '100%';
    if (progressText) progressText.textContent = '✅ PDF Uploaded!';


    setTimeout(() => {
        hideUploadForm();
        closeLibraryModal();
        loadLibraryBooks();
        addMessageToChat(`✅ ${title} uploaded successfully! Chapters are being extracted in background...`, "system");
    }, 800);


    extractChaptersInBackground(result.textbookId, result.downloadUrl, fileForExtraction, title);
}

// Extract chapters in background - doesn't block UI
async function extractChaptersInBackground(textbookId, downloadUrl, file, title) {
    try {
        console.log(`🔄 Starting background chapter extraction for: ${title}`);


        const savedCount = await extractChaptersFromPDF(downloadUrl, file, textbookId);

        if (savedCount > 0) {

            addMessageToChat(`📚 ${title}: ${savedCount} chapters extracted and ready to study!`, "system");
            console.log(`✅ Background extraction complete: ${savedCount} chapters`);
        } else {
            addMessageToChat(`⚠️ ${title}: Could not extract chapters. You can still read the PDF directly.`, "system");
        }
    } catch (error) {
        console.error("Background chapter extraction failed:", error);
        addMessageToChat(`⚠️ Chapter extraction for ${title} failed. PDF is still available.`, "system");
    }
}

// Save a single chapter to Firebase
async function saveChapterToFirebase(textbookId, chapter) {
    const { addDoc, collection } = await import('./firebase-config.js');
    const { db } = await import('./firebase-config.js');

    await addDoc(collection(db, 'textbook_chapters'), {
        bookId: textbookId,
        chapterNum: chapter.chapterNum,
        title: chapter.title,
        content: chapter.content,
        keywords: chapter.keywords || [],
        summary: chapter.summary || '',
        createdAt: new Date().toISOString()
    });
}


async function updateTextbookChaptersCount(textbookId, count) {
    const { doc, updateDoc } = await import('./firebase-config.js');
    const { db } = await import('./firebase-config.js');

    const textbookRef = doc(db, 'textbooks', textbookId);
    await updateDoc(textbookRef, {
        chaptersCount: count,
        chaptersExtracted: true
    });
}


async function extractChaptersFromPDF(pdfUrl, file, textbookId) {
    try {
        console.log("🔍 AI is reading and extracting chapters from the textbook...");

        // Convert file to base64
        const base64Data = await fileToBase64(file);


        const metadataPrompt = `Analyze this Bangladeshi NCTB textbook PDF. List ALL chapters with their structure.

Return ONLY a JSON array with chapter metadata (NOT full content):
[
  {
    "chapterNum": 1,
    "title": "Chapter title in original language",
    "pageRange": "1-15",
    "keywords": ["topic1", "topic2"],
    "summary": "2-3 sentence summary of this chapter"
  }
]

Rules:
- List EVERY chapter found
- Keep Bengali titles as-is
- Estimate page ranges
- Keep summaries brief (2-3 sentences max)
- Do NOT include full content text`;

        const metadataBody = {
            contents: [{
                role: "user",
                parts: [
                    { text: metadataPrompt },
                    {
                        inlineData: {
                            mimeType: base64Data.mimeType,
                            data: base64Data.data
                        }
                    }
                ]
            }],
            generationConfig: {
                temperature: 0.1,
                maxOutputTokens: 8000,
                responseMimeType: "application/json"
            }
        };

        const metadataResponse = await callGeminiAPI("gemini-2.0-flash", metadataBody, false);

        if (!metadataResponse.ok) {
            console.error("Chapter metadata extraction failed:", await metadataResponse.text());
            return [];
        }

        const metadataData = await metadataResponse.json();
        const metadataText = metadataData.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!metadataText) {
            console.error("No metadata text returned");
            return [];
        }

        let chaptersList;
        try {
            chaptersList = JSON.parse(metadataText);
            console.log(`📋 Found ${chaptersList.length} chapters`);
        } catch (e) {
            console.error("Failed to parse chapter metadata:", e);

            const fixedJson = tryFixTruncatedJson(metadataText);
            if (fixedJson) {
                chaptersList = fixedJson;
            } else {
                return [];
            }
        }

        // Step 2: Extract content for each chapter (one at a time)
        console.log(`📖 Found ${chaptersList.length} chapters. Extracting content...`);

        let savedCount = 0;

        for (let i = 0; i < chaptersList.length; i++) {
            const chapter = chaptersList[i];
            console.log(`📝 Processing chapter ${i + 1}/${chaptersList.length}: ${chapter.title}`);

            const contentPrompt = `From this textbook PDF, extract the FULL TEXT content of Chapter ${chapter.chapterNum}: "${chapter.title}".

Return ONLY a JSON object:
{
  "chapterNum": ${chapter.chapterNum},
  "title": "${chapter.title}",
  "content": "Full text content of this chapter...",
  "keywords": ${JSON.stringify(chapter.keywords || [])},
  "summary": "${chapter.summary || ''}"
}

Rules:
- Extract ALL text from this chapter
- Keep Bengali text as-is
- Include examples, formulas, definitions
- If content is very long, include key sections`;

            try {
                const contentBody = {
                    contents: [{
                        role: "user",
                        parts: [
                            { text: contentPrompt },
                            {
                                inlineData: {
                                    mimeType: base64Data.mimeType,
                                    data: base64Data.data
                                }
                            }
                        ]
                    }],
                    generationConfig: {
                        temperature: 0.1,
                        maxOutputTokens: 30000,
                        responseMimeType: "application/json"
                    }
                };

                const contentResponse = await callGeminiAPI("gemini-2.0-flash", contentBody, false);

                if (contentResponse.ok) {
                    const contentData = await contentResponse.json();
                    const contentText = contentData.candidates?.[0]?.content?.parts?.[0]?.text;

                    if (contentText) {
                        try {
                            const chapterContent = JSON.parse(contentText);

                            await saveChapterToFirebase(textbookId, chapterContent);
                            savedCount++;
                            console.log(`✅ Saved chapter ${i + 1}/${chaptersList.length}`);
                        } catch (e) {

                            await saveChapterToFirebase(textbookId, {
                                ...chapter,
                                content: `Content for ${chapter.title}. Click to load from PDF.`
                            });
                            savedCount++;
                        }
                    }
                } else {
                    // Save metadata only
                    await saveChapterToFirebase(textbookId, {
                        ...chapter,
                        content: `Content for ${chapter.title}. Click to load from PDF.`
                    });
                    savedCount++;
                }
            } catch (e) {
                console.error(`Error extracting chapter ${i + 1}:`, e);

                try {
                    await saveChapterToFirebase(textbookId, {
                        ...chapter,
                        content: `Content for ${chapter.title}. Click to load from PDF.`
                    });
                    savedCount++;
                } catch (saveErr) {
                    console.error('Failed to save chapter:', saveErr);
                }
            }


            await new Promise(r => setTimeout(r, 500));
        }

        // Update textbook with chapters count
        await updateTextbookChaptersCount(textbookId, savedCount);

        console.log(`✅ Extracted and saved ${savedCount} chapters`);
        return savedCount;

    } catch (error) {
        console.error("Error extracting chapters:", error);
        return [];
    }
}


function tryFixTruncatedJson(text) {
    try {

        return JSON.parse(text);
    } catch (e) {
        // Try to close unclosed arrays/objects
        let fixed = text.trim();


        const openBrackets = (fixed.match(/\[/g) || []).length;
        const closeBrackets = (fixed.match(/\]/g) || []).length;
        const openBraces = (fixed.match(/\{/g) || []).length;
        const closeBraces = (fixed.match(/\}/g) || []).length;


        if (openBraces > closeBraces) {
            // Find last complete object and truncate there
            const lastCompleteObj = fixed.lastIndexOf('},');
            if (lastCompleteObj > 0) {
                fixed = fixed.substring(0, lastCompleteObj + 1);
            }
        }


        for (let i = 0; i < openBraces - closeBraces; i++) {
            fixed += '}';
        }
        for (let i = 0; i < openBrackets - closeBrackets; i++) {
            fixed += ']';
        }

        try {
            return JSON.parse(fixed);
        } catch (e2) {
            console.error("Could not fix truncated JSON");
            return null;
        }
    }
}


async function openBook(bookId) {
    const book = libraryTextbooks.find(b => b.id === bookId);
    if (!book) return;

    selectedTextbook = book;

    // Open chapter modal
    const libraryModal = document.getElementById('library-modal');
    const chapterModal = document.getElementById('chapter-modal');

    if (libraryModal) libraryModal.classList.add('hidden');
    if (chapterModal) chapterModal.classList.remove('hidden');


    const titleEl = document.getElementById('chapter-book-title');
    if (titleEl) titleEl.textContent = `📖 ${book.title || SUBJECT_NAMES[book.subject]?.bn || book.subject}`;


    const chaptersList = document.getElementById('chapters-list');

    // Check cache first
    const cached = getCachedTextbook(bookId);
    let chapters = [];

    if (cached && cached.chapters && cached.chapters.length > 0) {
        // Use cached chapters (instant load)
        chapters = cached.chapters;
        console.log(`⚡ Loaded ${chapters.length} chapters from cache`);
    } else {
        // Show loading and fetch from database
        if (chaptersList) {
            chaptersList.innerHTML = `
                <div class="library-loading">
                    <div class="loading-spinner"></div>
                    <span>Loading chapters...</span>
                </div>
            `;
        }

        chapters = await getTextbookChapters(bookId);

        // Save to cache if chapters found
        if (chapters.length > 0) {
            saveTextbookToCache(bookId, book, chapters);
        }
    }

    if (chapters.length === 0) {
        if (chaptersList) {
            chaptersList.innerHTML = `
                <div class="library-loading">
                    <span>📝 No chapters extracted yet</span>
                    <p style="font-size: 0.85rem; margin-top: 8px;">Chapters are being processed...</p>
                </div>
            `;
        }
        return;
    }

    // Render chapters
    if (chaptersList) {
        chaptersList.innerHTML = chapters.map(chapter => `
            <div class="chapter-item" onclick="studyChapter('${chapter.id}')">
                <span class="chapter-num">${chapter.chapterNum}</span>
                <div class="chapter-info">
                    <div class="chapter-title">${chapter.title}</div>
                    <div class="chapter-summary">${chapter.summary || 'Click to study this chapter'}</div>
                </div>
                <button class="chapter-action">Study</button>
            </div>
        `).join('');
    }
}


async function studyChapter(chapterId) {
    // Try cache first, then database
    const cached = getCachedTextbook(selectedTextbook.id);
    let chapters = cached?.chapters || await getTextbookChapters(selectedTextbook.id);
    const chapter = chapters.find(c => c.id === chapterId);

    if (!chapter) {
        addMessageToChat("❌ Chapter not found", "system");
        return;
    }

    // Close modals
    document.getElementById('chapter-modal')?.classList.add('hidden');
    document.getElementById('library-modal')?.classList.add('hidden');


    window.currentChapterContent = chapter.content;
    window.currentChapterTitle = chapter.title;


    setMode('curriculum');

    // Send to chat
    const subjectInfo = SUBJECT_NAMES[selectedTextbook.subject] || { bn: selectedTextbook.subject, en: selectedTextbook.subject };
    addMessageToChat(
        `📖 **${chapter.title}** (${subjectInfo.bn} - Class ${selectedTextbook.class})\n\nTeaching from textbook chapter. Ask me anything about this topic!`,
        "system"
    );


    const teachRequest = `Teach me chapter ${chapter.chapterNum}: "${chapter.title}" from my ${subjectInfo.en || subjectInfo.bn} textbook. Start with an engaging introduction and main concepts.`;


    conversationHistory.push({ role: 'user', content: teachRequest });

    // Auto-start teaching
    await processWithGemini(teachRequest, 'curriculum');
}


window.openBook = openBook;
window.promptUpload = promptUpload;
window.studyChapter = studyChapter;
window.showUploadForm = showUploadForm;


// Handle Send Message

async function handleSendMessage() {
    const message = elements.userInput.value.trim();
    console.log("📨 handleSendMessage called, message:", message, "isProcessing:", isProcessing);
    if (!message || isProcessing) return;

    // If Live mode is active, send via Live API instead
    if (isLiveSessionActive && liveChatController) {
        elements.userInput.value = "";
        elements.userInput.style.height = "auto";
        sendLiveText(message);
        return;
    }


    const user = getCurrentUser();
    const canProceed = await canPerformAction('aiConversation');

    if (!canProceed.allowed) {
        showUpgradePrompt(canProceed.reason);
        return;
    }

    // INTERRUPT: Stop any current speech for new message
    interruptForNewMessage();


    elements.userInput.value = "";
    elements.userInput.style.height = "auto";


    if (!canProceed.unlimited) {
        const userId = user?.uid || null;
        await deductCredits(userId, 'aiConversation');
        updateCreditsDisplay();
    }

    // Add user message to chat
    addMessageToChat(message, "user");

    // Check if this is a quiz conversation response (e.g., user answering how many questions)
    if (await handleQuizConversation(message)) {
        isProcessing = false;
        return;
    }

    // Note: Quiz is now handled via conversational flow + magic overlay
    // Text-based quiz answer handling removed


    conversationHistory.push({ role: "user", content: message });


    isProcessing = true;
    updateStatus("thinking");

    // Show thinking behavior while processing
    if (head) {
        TeacherBehavior.thinkingSequence();
    }

    try {

        const context = {
            hasUploadedFile: !!uploadedFile,
            hasActiveTextbook: studentProfile !== null,
            currentMode: currentMode
        };

        let detectedMode = currentMode;

        // Check for quiz intent in chat OR curriculum mode
        if (currentMode === 'chat' || currentMode === 'curriculum') {
            const intent = detectIntent(message, context);

            // Handle quiz intent immediately (before AI responds)
            if (intent.type === 'quiz' && intent.confidence > 0.7) {
                await processQuizMode(message);
                isProcessing = false;
                updateStatus("online");
                return;
            }

            // Only switch mode for high-confidence detections (non-quiz)
            if (currentMode === 'chat' && intent.confidence > 0.8 && intent.type !== 'chat' && intent.type !== 'quiz') {
                detectedMode = intent.type;

                const modeConfig = getModeButtons().find(m => m.id === intent.type);
                if (modeConfig) {
                    addMessageToChat(`${modeConfig.icon} Switching to ${modeConfig.label} mode...`, "system");
                }
            }
        }

        // Check for image generation request
        if (isImageRequest(message)) {
            if (hasSpecificTopic(message)) {

                const isBengali = /[\u0980-\u09FF]/.test(message);


                await announceDrawing(isBengali);

                addMessageToChat("🎨 Creating educational visualization...", "system");
                const result = await generateEducationalImage(message);

                if (result.success) {
                    // Show in chat AND magic overlay
                    displayGeneratedImage(result.imageData, result.mimeType);
                    showMagicImageOverlay(result.imageData, result.mimeType);


                    console.log("🔍 Getting explanation of actual image content...");
                    const imageExplanation = await explainGeneratedImage(
                        result.imageData,
                        result.mimeType,
                        message
                    );

                    if (imageExplanation) {

                        addMessageToChat(imageExplanation, "teacher");
                        await speakTextWithParallelTTS(imageExplanation);
                    } else {
                        // Fallback: Ask Gemini to explain the topic properly
                        console.log("⚠️ Vision failed, using topic explanation fallback");
                        const topic = extractTopicFromMessage(message);
                        const explainPrompt = isBengali
                            ? `এই ছবিতে ${topic} বিষয়টি দেখানো হয়েছে। শিক্ষার্থীদের জন্য এই বিষয়টি ৪-৫ লাইনে সহজভাবে ব্যাখ্যা করো। মূল ধারণা, সূত্র বা উদাহরণ দাও।`
                            : `This image shows ${topic}. Explain this topic in 4-5 lines for students. Include key concepts, formulas, or examples.`;

                        await processWithGemini(explainPrompt, 'chat');
                    }


                    hideMagicImageOverlay();
                } else {

                    await processWithGemini(message, 'chat');
                }

                isProcessing = false;
                updateStatus("online");
                return;
            } else {
                // Topic is vague - try to get topic from conversation history
                const conversationContext = getTopicFromConversationHistory();

                if (conversationContext) {

                    addMessageToChat("🔍 Understanding context from our conversation...", "system");
                    const extractedTopic = await extractTopicFromContext(conversationContext);

                    if (extractedTopic && extractedTopic.length > 3) {
                        console.log("📚 Extracted topic from context:", extractedTopic);


                        const isBengali = /[\u0980-\u09FF]/.test(conversationContext);

                        // Teacher announces drawing
                        await announceDrawing(isBengali);

                        const imagePrompt = isBengali
                            ? `${extractedTopic} সম্পর্কে একটি শিক্ষামূলক ডায়াগ্রাম আঁক`
                            : `Draw an educational diagram about ${extractedTopic}`;

                        addMessageToChat(`🎨 Creating visualization about: ${extractedTopic}...`, "system");
                        const result = await generateEducationalImage(imagePrompt);

                        if (result.success) {

                            displayGeneratedImage(result.imageData, result.mimeType);
                            showMagicImageOverlay(result.imageData, result.mimeType);


                            console.log("🔍 Getting explanation of actual image content...");
                            const imageExplanation = await explainGeneratedImage(
                                result.imageData,
                                result.mimeType,
                                imagePrompt
                            );

                            if (imageExplanation) {
                                addMessageToChat(imageExplanation, "teacher");
                                await speakTextWithParallelTTS(imageExplanation);
                            }

                            // Hide magic overlay after explanation done
                            hideMagicImageOverlay();
                        } else {
                            await processWithGemini(message, 'chat');
                        }

                        isProcessing = false;
                        updateStatus("online");
                        return;
                    }
                }


                const isBengali = /[\u0980-\u09FF]/.test(message);
                const askTopicMsg = isBengali
                    ? "আমি ছবি আঁকতে পারি! 🎨 কোন বিষয়ে ছবি দেখতে চাও? যেমন:\n• \"নিউটনের গতির সূত্র ছবি দেখাও\"\n• \"সালোকসংশ্লেষণ প্রক্রিয়া ছবি আঁক\"\n• \"পানির চক্র ডায়াগ্রাম দেখাও\""
                    : "I can draw educational images! 🎨 What topic would you like me to visualize? For example:\n• \"Draw Newton's laws of motion\"\n• \"Show photosynthesis process\"\n• \"Visualize the water cycle\"";

                addMessageToChat(askTopicMsg, "teacher");
                speakText(askTopicMsg);
                isProcessing = false;
                updateStatus("online");
                return;
            }
        }


        if (detectedMode === 'research') {
            await processResearchMode(message);
        } else {
            await processWithGemini(message, detectedMode);
        }

    } catch (error) {
        console.error("❌ Error processing message:", error);
        addMessageToChat("I apologize, but I encountered an error. Please try again.", "teacher");

        // Show sad mood on error
        if (head) {
            TeacherBehavior.setMood('sad');
            setTimeout(() => TeacherBehavior.setMood('neutral'), 2000);
        }
    }

    isProcessing = false;
    updateStatus("online");
}



// ===========================================
async function processWithGemini(userMessage, mode = 'chat') {

    aiController = new AbortController();


    const typingDiv = addTypingIndicator();

    console.log("🔄 processWithGemini started for:", userMessage, "mode:", mode);

    try {
        // Build the system prompt based on mode and teacher gender
        const teacherGender = CONFIG.currentTeacher;
        let modePrompt = MODE_PROMPTS[mode] || MODE_PROMPTS.chat;


        let systemPrompt = typeof modePrompt === 'object' ? (modePrompt[teacherGender] || modePrompt.male) : modePrompt;
        systemPrompt += "\n\n" + (SUBJECT_CONTEXTS[CONFIG.subjectFocus] || SUBJECT_CONTEXTS.general);

        // Add student context if available
        if (studentProfile) {
            systemPrompt += `\n\nSTUDENT CONTEXT:
- Country: ${studentProfile.countryName}
- Board: ${studentProfile.board}
- Class: ${studentProfile.class}
- Stream: ${studentProfile.stream}
- Subjects: ${studentProfile.subjects?.join(', ')}

Tailor your teaching to this student's curriculum level.`;
        }


        if (mode === 'curriculum') {
            const curriculumInfo = extractCurriculumInfo(userMessage);
            if (curriculumInfo.subject) {
                const results = searchCurriculum(studentProfile?.country || 'bangladesh', curriculumInfo.subject);
                if (results.length > 0) {
                    systemPrompt += `\n\nRELEVANT CURRICULUM DATA:\n${JSON.stringify(results.slice(0, 3), null, 2)}`;
                }
            }


            if (window.currentChapterContent) {
                systemPrompt += `\n\n📚 TEXTBOOK CHAPTER CONTENT:
Title: ${window.currentChapterTitle || 'Chapter'}
Content:
${window.currentChapterContent}

INSTRUCTIONS: Teach from this textbook content. Use examples and explanations from the text. Reference page concepts when explaining.`;
            }
        }

        // Select appropriate model for the task
        const model = getModelForTask(mode, !!uploadedFileData, uploadedFileData?.mimeType);


        const generationConfig = buildGenerationConfig(mode, uploadedFileData?.mimeType);


        const body = {
            contents: [],
            systemInstruction: { parts: [{ text: systemPrompt }] },
            generationConfig: generationConfig,
            safetySettings: [
                { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
                { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
                { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
                { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" }
            ]
        };

        // Add Google Search grounding for research mode
        if (mode === 'research') {
            body.tools = [{ googleSearch: {} }];
        }


        const recentHistory = conversationHistory.slice(-10);
        recentHistory.forEach(msg => {
            const parts = [{ text: msg.content }];


            if (msg.role === 'user' && msg === recentHistory[recentHistory.length - 1] && uploadedFileData && mode === 'file') {
                // Check if we have a file URI (uploaded to Gemini Files API) or inline data
                if (uploadedFileUri) {

                    parts.push({
                        fileData: {
                            fileUri: uploadedFileUri,
                            mimeType: uploadedFileData.mimeType
                        }
                    });
                    console.log("📁 Using Gemini Files API URI:", uploadedFileUri);
                } else if (uploadedFileData.data) {

                    const mediaResolution = getMediaResolution(uploadedFileData.mimeType);
                    parts.push({
                        inlineData: {
                            mimeType: uploadedFileData.mimeType,
                            data: uploadedFileData.data
                        },
                        mediaResolution: {
                            level: mediaResolution
                        }
                    });
                    console.log("📄 Using inline base64 data");
                }
            }

            body.contents.push({
                role: msg.role === "user" ? "user" : "model",
                parts: parts
            });
        });

        // API endpoint - use serverless in production, direct in local
        let url, headers;
        if (CONFIG.isProduction) {
            url = CONFIG.apiEndpoints.geminiStream;
            headers = { "Content-Type": "application/json" };
            body.model = model; // Include model in body for serverless
            console.log("📡 Using serverless API:", url);
        } else {
            url = `${CONFIG.geminiEndpoint}${model}:streamGenerateContent?alt=sse`;
            headers = {
                "Content-Type": "application/json",
                "x-goog-api-key": CONFIG.geminiApiKey
            };
            console.log("📡 API URL:", url);
        }
        console.log("🤖 Model:", model);
        console.log("🧠 Thinking level:", generationConfig.thinkingConfig?.thinkingLevel);


        const response = await fetch(url, {
            method: "POST",
            headers: headers,
            body: JSON.stringify(body),
            signal: aiController.signal
        });

        console.log("📥 Response status:", response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error("❌ API Error response:", errorText);
            throw new Error(`API Error: ${response.status} - ${errorText}`);
        }


        typingDiv.remove();

        // Create message element for streaming
        const messageDiv = addMessageToChat("", "teacher");
        const contentDiv = messageDiv.querySelector(".message-content");


        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let fullResponse = "";


        let sentToTTS = "";
        let ttsPromises = [];  // Store TTS promises in order
        let ttsIndex = 0;

        while (true) {
            const { done, value } = await reader.read();

            if (done) break;


            const text = decoder.decode(value);
            const lines = text.split("\n");

            for (const line of lines) {
                if (line.startsWith("data: ")) {
                    try {
                        const data = JSON.parse(line.substring(6));
                        const content = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

                        if (content) {
                            fullResponse += content;


                            contentDiv.innerHTML = dompurify.sanitize(marked.parse(fullResponse));

                            // Scroll to bottom
                            elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;


                            if (CONFIG.tts.enabled) {
                                const unsentText = fullResponse.substring(sentToTTS.length);

                                const sentences = unsentText.match(/[^.!?।]+[.!?।]+/g);

                                if (sentences) {
                                    for (const sentence of sentences) {
                                        const cleanSentence = cleanTextForTTS(sentence);
                                        if (cleanSentence && cleanSentence.length > 3) {
                                            sentToTTS += sentence;
                                            const idx = ttsIndex++;
                                            console.log(`🚀 S${idx + 1} detected - sending TTS:`, cleanSentence.substring(0, 40) + "...");

                                            // Start TTS request immediately (don't await - runs parallel!)
                                            const ttsPromise = fetchTTSAudio(cleanSentence, idx);
                                            ttsPromises.push(ttsPromise);
                                        }
                                    }
                                }
                            }
                        }
                    } catch (e) {

                    }
                }
            }
        }


        const remainingText = fullResponse.substring(sentToTTS.length).trim();
        if (remainingText && CONFIG.tts.enabled) {
            const cleanRemaining = cleanTextForTTS(remainingText);
            if (cleanRemaining && cleanRemaining.length > 3) {
                const idx = ttsIndex++;
                console.log(`🚀 S${idx + 1} (final) - sending TTS:`, cleanRemaining.substring(0, 40) + "...");
                const ttsPromise = fetchTTSAudio(cleanRemaining, idx);
                ttsPromises.push(ttsPromise);
            }
        }

        // Play all audios in order (they were fetched in parallel!)
        if (ttsPromises.length > 0) {
            console.log(`🎵 Playing ${ttsPromises.length} audio segments in order...`);
            await playTTSAudiosInOrder(ttsPromises);
        }


        conversationHistory.push({ role: "model", content: fullResponse });


        updateMoodBasedOnContent(fullResponse);

        // Update progress if we can identify the topic
        if (mode === 'curriculum' || mode === 'chat') {
            const curriculumInfo = extractCurriculumInfo(userMessage);
            if (curriculumInfo.subject) {
                progressTracker.updateMastery(
                    curriculumInfo.subject,
                    curriculumInfo.topic || 'general',
                    true
                );
            }
        }


        if (getCurrentUser()) {
            try {

                const cleanedHistory = conversationHistory.filter(msg =>
                    msg && msg.role && msg.parts && msg.parts[0] && msg.parts[0].text !== undefined
                );

                // Save chat history with mode
                if (cleanedHistory.length > 0) {
                    await saveChatHistory(mode, cleanedHistory);
                }


                const subjectMastery = progressTracker.subjectMastery;
                if (subjectMastery && typeof subjectMastery === 'object') {
                    for (const [subject, topics] of Object.entries(subjectMastery)) {
                        if (topics && typeof topics === 'object') {
                            for (const [topic, data] of Object.entries(topics)) {
                                if (data && data.mastery !== undefined) {
                                    await saveProgress(
                                        subject,
                                        topic,
                                        data.mastery || 0,
                                        data.attempts || 0
                                    );
                                }
                            }
                        }
                    }
                }


                await saveLearningState(progressTracker);

                console.log("💾 Auto-saved progress and chat history");
            } catch (error) {
                console.error("❌ Error auto-saving data:", error);
            }
        }

    } catch (error) {
        typingDiv.remove();

        if (error.name === "AbortError") {
            console.log("Request aborted");
        } else {
            throw error;
        }
    } finally {
        aiController = null;
    }
}

// ===========================================


async function processResearchMode(topic) {
    // Immediate response
    addMessageToChat(`🔍 Starting deep research on "${topic}"... I'll notify you when it's complete! You can keep chatting in the meantime.`, "teacher");

    if (head) {
        head.setMood("fear");
        await speakText(`Starting deep research on ${topic}. I'll notify you when it's ready. Feel free to ask other questions!`);
    }


    const researchId = Date.now().toString();

    const researchPromise = performDeepResearch(topic);
    pendingResearch.set(researchId, { topic, promise: researchPromise });

    researchPromise.then(async (result) => {
        // Research complete
        pendingResearch.delete(researchId);


        addMessageToChat(`📊 **Research Complete: ${topic}**\n\n${result}`, "teacher");

        if (head) {
            head.setMood("happy");
            await speakText(`Your research on ${topic} is complete! Check the chat for the full report.`);
            setTimeout(() => head.setMood("neutral"), 3000);
        }


        progressTracker.updateMastery('Research', topic, true);

    }).catch(error => {
        console.error("Research error:", error);
        addMessageToChat(`❌ Research on "${topic}" failed. Please try again.`, "system");
    });
}

async function performDeepResearch(topic) {
    const systemPrompt = `You are conducting comprehensive academic research on the topic: "${topic}"

Provide a well-structured, detailed report covering:
1. OVERVIEW: Brief introduction to the topic
2. KEY CONCEPTS: Main ideas and definitions
3. DEEP ANALYSIS: Detailed examination
4. REAL-WORLD APPLICATIONS: How it's used in practice
5. CURRENT DEVELOPMENTS: Recent advances (use Google Search for latest info)
6. SUMMARY: Key takeaways

Be thorough, educational, and accurate. Use proper formatting with headers.
Include citations from your search results when possible.`;

    // Get model and config for research
    const model = getModelForTask('research');
    const generationConfig = buildGenerationConfig('research');


    const body = {
        contents: [{ role: "user", parts: [{ text: `Research topic: ${topic}` }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig: generationConfig,

        tools: [{ googleSearch: {} }]
    };

    console.log("🔬 Research using model:", model);

    const response = await callGeminiAPI(model, body, false);

    if (!response.ok) {
        throw new Error(`Research API Error: ${response.status}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "Research failed to generate results.";
}

// ===========================================


async function generateEducationalImage(prompt) {
    console.log("🎨 Generating educational image:", prompt);

    // Detect if Bengali text - use Nano Banana Pro for complex Bengali rendering
    const isBengali = /[\u0980-\u09FF]/.test(prompt);



    const model = isBengali ? "gemini-3-pro-image-preview" : "gemini-2.5-flash-image";

    const imagePrompt = isBengali
        ? `Create an educational diagram or illustration with Bengali labels: ${prompt}. Make it clear, colorful, visually appealing and easy to understand for students. Use Bengali text for all labels and annotations.`
        : `Create an educational diagram or illustration: ${prompt}. Make it clear, colorful, visually appealing and easy to understand for students. Include labels where helpful.`;

    const body = {
        contents: [{
            parts: [{ text: imagePrompt }]
        }],
        generationConfig: {
            responseModalities: ["IMAGE"]
        }
    };

    console.log(`🎨 Image generation using ${isBengali ? 'Nano Banana Pro' : 'Nano Banana'} (${model}) @ 1K resolution`);

    try {
        const response = await callGeminiAPI(model, body, false);

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Image generation error:", errorText);
            throw new Error(`Image API Error: ${response.status}`);
        }

        const data = await response.json();
        console.log("🎨 Image response received");


        const parts = data.candidates?.[0]?.content?.parts || [];
        for (const part of parts) {
            if (part.inlineData) {
                return {
                    success: true,
                    imageData: part.inlineData.data,
                    mimeType: part.inlineData.mimeType || "image/png"
                };
            }
        }

        // If no image, return text explanation
        for (const part of parts) {
            if (part.text) {
                return {
                    success: false,
                    text: part.text
                };
            }
        }

        return { success: false, text: "Image generation not available. Let me explain instead." };

    } catch (error) {
        console.error("Image generation failed:", error);
        return { success: false, error: error.message };
    }
}


async function explainGeneratedImage(imageData, mimeType, originalPrompt) {
    console.log("🔍 Analyzing generated image with Gemini Vision...");

    const isBengali = /[\u0980-\u09FF]/.test(originalPrompt);

    const visionPrompt = isBengali
        ? `তুমি একজন বন্ধুসুলভ শিক্ষক। এই ছবিটি মনোযোগ দিয়ে দেখো। ছবিতে কী কী আছে এবং কী বোঝানো হয়েছে তা ৪-৬ লাইনে সহজ বাংলায় ব্যাখ্যা করো। শিক্ষার্থীরা যেন সহজে বুঝতে পারে এমনভাবে বলো।`
        : `You are a friendly teacher. Look at this image carefully. Explain in 4-6 lines what is shown in the image and what concepts it illustrates. Make it easy for students to understand.`;

    try {
        const body = {
            contents: [{
                role: "user",
                parts: [
                    {
                        inlineData: {
                            mimeType: mimeType,
                            data: imageData
                        }
                    },
                    { text: visionPrompt }
                ]
            }],
            generationConfig: {
                maxOutputTokens: 500,
                temperature: 0.7
            }
        };

        const response = await callGeminiAPI("gemini-2.0-flash", body, false);

        console.log("🔍 Vision API response status:", response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Vision API error response:", errorText);
            throw new Error(`Vision API error: ${response.status}`);
        }

        const data = await response.json();
        console.log("🔍 Vision API response data:", JSON.stringify(data).substring(0, 200));

        const explanation = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (explanation) {
            console.log("✅ Image explanation received:", explanation.substring(0, 100) + "...");
            return explanation;
        }

        console.warn("⚠️ No explanation in response");
        return null;
    } catch (error) {
        console.error("❌ Image explanation failed:", error);
        return null;
    }
}


function isImageRequest(message) {
    const imageKeywords = [
        // English
        'draw', 'generate image', 'create image', 'show me', 'visualize',
        'diagram', 'illustrate', 'picture of', 'image of', 'chart',
        // Bangla
        'ছবি', 'আঁক', 'দেখাও', 'একে', 'চিত্র',
        // Hindi
        'चित्र', 'तस्वीर', 'बनाओ', 'दिखाओ', 'ड्रा', 'छवि',
        // Arabic
        'ارسم', 'صورة', 'رسم', 'اظهر',
        // Spanish
        'dibuja', 'dibujar', 'imagen', 'muéstrame', 'visualizar',
        // French
        'dessine', 'dessiner', 'image', 'montre-moi', 'visualiser',
        // Chinese
        '画', '图片', '绘制', '显示', '画图',
        // Japanese
        '描く', '絵', '画像', '見せて',
        // Korean
        '그려', '그림', '이미지', '보여줘',
        // Portuguese
        'desenhar', 'desenhe', 'imagem', 'mostre',
        // Russian
        'рисуй', 'нарисуй', 'картинка', 'покажи', 'изображение',
        // German
        'zeichne', 'bild', 'zeig mir',
        // Turkish
        'çiz', 'resim', 'göster',
        // Indonesian
        'gambar', 'lukis', 'tunjukkan',
        // Vietnamese
        'vẽ', 'hình ảnh', 'hiển thị',
        // Thai
        'วาด', 'รูป', 'แสดง',
        // Urdu
        'تصویر', 'بناؤ', 'دکھاؤ'
    ];
    const msgLower = message.toLowerCase();
    return imageKeywords.some(keyword => msgLower.includes(keyword));
}


function hasSpecificTopic(message) {
    const vaguePatterns = [
        // Bangla vague patterns
        /^[\s]*ছবি[\s]*(আঁক|দেখাও|বুঝাও|একে)?[\s]*$/i,
        /^[\s]*তুমি[\s]*(ছবি|picture)[\s]*(আঁক|দেখাও|বুঝাও|একে)?[\s]*(বুঝাও)?[\s]*$/i,
        /^[\s]*একটা?[\s]*ছবি[\s]*(আঁক|দেখাও)?[\s]*$/i,
        // English vague patterns
        /^[\s]*(draw|show|create)[\s]*(a|an)?[\s]*(picture|image|diagram)?[\s]*$/i,
        /^[\s]*generate[\s]*(an?)?[\s]*image[\s]*$/i,
        // Hindi vague patterns
        /^[\s]*(चित्र|तस्वीर)[\s]*(बनाओ|दिखाओ)?[\s]*$/i,
        /^[\s]*एक[\s]*(चित्र|तस्वीर)[\s]*(बनाओ)?[\s]*$/i,
        // Arabic vague patterns
        /^[\s]*(ارسم|صورة)[\s]*$/i,
        // Spanish vague patterns
        /^[\s]*(dibuja|dibujar)[\s]*(una?)?[\s]*(imagen)?[\s]*$/i,
        // French vague patterns
        /^[\s]*(dessine|dessiner)[\s]*(une?)?[\s]*(image)?[\s]*$/i,
        // Chinese vague patterns
        /^[\s]*(画|绘制)[\s]*(一个?)?[\s]*(图|图片)?[\s]*$/i,
        // Other languages vague
        /^[\s]*(描く|그려|рисуй)[\s]*$/i
    ];


    if (vaguePatterns.some(pattern => pattern.test(message))) {
        return false;
    }


    const cleanMsg = message.replace(/[^\w\u0980-\u09FF]/g, '').trim();
    if (cleanMsg.length < 8) {
        return false;
    }

    return true;
}

// Extract topic from conversation history when user request is vague
function getTopicFromConversationHistory() {

    const recentHistory = conversationHistory.slice(-6);

    if (recentHistory.length === 0) {
        return null;
    }

    // Build context from recent messages
    let context = "";
    for (const msg of recentHistory) {
        if (msg.role === "user" || msg.role === "model") {

            if (Array.isArray(msg.parts)) {
                for (const part of msg.parts) {
                    if (part.text) {
                        context += part.text + " ";
                    }
                }
            }
        }
    }


    return context.trim();
}

// Use Gemini to extract topic from conversation context
async function extractTopicFromContext(context) {
    const isBengali = /[\u0980-\u09FF]/.test(context);

    const extractPrompt = isBengali
        ? `এই কথোপকথন থেকে মূল শিক্ষার বিষয়টি এক লাইনে বলো (শুধু বিষয়ের নাম, কোন বাক্য নয়):\n\n${context}\n\nবিষয়:`
        : `Extract the main educational topic from this conversation in one line (just the topic name, no sentences):\n\n${context}\n\nTopic:`;

    try {
        const body = {
            contents: [{ role: "user", parts: [{ text: extractPrompt }] }],
            generationConfig: { maxOutputTokens: 50, temperature: 0.1 }
        };

        const response = await callGeminiAPI("gemini-2.0-flash", body, false);
        const data = await response.json();
        if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
            return data.candidates[0].content.parts[0].text.trim();
        }
    } catch (err) {
        console.error("Topic extraction failed:", err);
    }
    return null;
}


function extractTopicFromMessage(message) {

    const removePatterns = [
        /ছবি[\s]*(আঁক|দেখাও|বুঝাও|একে)?/gi,
        /তুমি/gi,
        /আমাকে/gi,
        /draw/gi, /show/gi, /create/gi, /generate/gi,
        /picture/gi, /image/gi, /diagram/gi, /visualize/gi,
        /of/gi, /a/gi, /an/gi, /the/gi, /about/gi,
        /please/gi, /can you/gi, /could you/gi
    ];

    let topic = message;
    removePatterns.forEach(pattern => {
        topic = topic.replace(pattern, ' ');
    });

    // Clean up extra spaces
    topic = topic.replace(/\s+/g, ' ').trim();


    return topic || message;
}


function displayGeneratedImage(imageData, mimeType) {
    const messageDiv = document.createElement("div");
    messageDiv.className = "message teacher";
    messageDiv.innerHTML = `
        <div class="message-content">
            <p>🎨 Here's the visualization:</p>
            <img src="data:${mimeType};base64,${imageData}" 
                 alt="Generated educational image" 
                 style="max-width: 100%; border-radius: 12px; margin-top: 10px;">
        </div>
        <span class="message-time">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
    `;
    elements.chatMessages.appendChild(messageDiv);
    elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;

    // Save image to chat history
    currentChatMessages.push({
        role: "model",
        content: "🎨 Generated educational image",
        type: "image",
        imageData: imageData,
        mimeType: mimeType,
        timestamp: new Date().toISOString()
    });

    // Trigger auto-save
    clearTimeout(window.autoSaveTimeout);
    window.autoSaveTimeout = setTimeout(() => {
        autoSaveChat();
    }, 2000);
}

// Show magic floating image on left side
function showMagicImageOverlay(imageData, mimeType) {
    const overlay = document.getElementById('magic-image-overlay');
    const img = document.getElementById('magic-image');

    if (overlay && img) {
        img.src = `data:${mimeType};base64,${imageData}`;
        overlay.classList.remove('hidden', 'fading-out');

        document.body.classList.add('magic-image-active');

        // On mobile, close chat panel
        if (window.innerWidth <= 480) {
            const chatPanel = document.querySelector('.hologram-panel');
            if (chatPanel) {
                chatPanel.classList.add('hidden-by-overlay');
            }
        }

        requestAnimationFrame(() => {
            overlay.classList.add('visible');
        });
        console.log("✨ Magic image overlay shown");
    }
}

// Hide magic image overlay with fade animation
function hideMagicImageOverlay() {
    const overlay = document.getElementById('magic-image-overlay');

    if (overlay) {
        overlay.classList.add('fading-out');
        overlay.classList.remove('visible');

        document.body.classList.remove('magic-image-active');

        // On mobile, restore chat panel
        if (window.innerWidth <= 480) {
            const chatPanel = document.querySelector('.hologram-panel');
            if (chatPanel) {
                chatPanel.classList.remove('hidden-by-overlay');
            }
        }

        setTimeout(() => {
            overlay.classList.add('hidden');
            overlay.classList.remove('fading-out');
            console.log("✨ Magic image overlay hidden");
        }, 800);
    }
}

// Teacher announces drawing (with TTS)
async function announceDrawing(isBengali) {
    const announcement = isBengali
        ? "দাঁড়াও, আমি তোমার জন্য একটা ছবি আঁকছি! ✨"
        : "Wait, I'm drawing a picture for you! ✨";

    addMessageToChat(announcement, "teacher");


    if (CONFIG.tts.enabled) {
        speakText(announcement);
    }


    await new Promise(resolve => setTimeout(resolve, 500));
}

// Quiz system is in the UNIFIED QUIZ AI section below (around line ~9300)

// Detect language from message text (for quiz/image multi-language support)
function detectMessageLanguage(message) {
    // Bengali script
    if (/[\u0980-\u09FF]/.test(message)) return 'bn';
    // Hindi/Devanagari script  
    if (/[\u0900-\u097F]/.test(message)) return 'hi';
    // Arabic script
    if (/[\u0600-\u06FF]/.test(message)) return 'ar';
    // Chinese characters
    if (/[\u4e00-\u9fff]/.test(message)) return 'zh';
    // Japanese (Hiragana/Katakana)
    if (/[\u3040-\u309F\u30A0-\u30FF]/.test(message)) return 'ja';
    // Korean (Hangul)
    if (/[\uAC00-\uD7AF\u1100-\u11FF]/.test(message)) return 'ko';
    // Thai script
    if (/[\u0E00-\u0E7F]/.test(message)) return 'th';
    // Cyrillic (Russian, Ukrainian, etc.)
    if (/[\u0400-\u04FF]/.test(message)) return 'ru';
    // Tamil script
    if (/[\u0B80-\u0BFF]/.test(message)) return 'ta';
    // Telugu script
    if (/[\u0C00-\u0C7F]/.test(message)) return 'te';
    // Vietnamese (has special diacritics)
    if (/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(message)) return 'vi';
    // Default to English
    return 'en';
}


// PARALLEL TTS - Max 3 concurrent (ElevenLabs limit)


const MAX_CONCURRENT_TTS = 3;
let activeTTSRequests = 0;
let ttsPendingQueue = [];

async function fetchTTSAudio(text, index) {
    const startTime = Date.now();
    console.log(`🎙️ fetchTTSAudio called for S${index + 1}, text: "${text.substring(0, 50)}..."`);
    console.log(`🎙️ TTS provider: ${CONFIG.tts.provider}, TTS enabled: ${CONFIG.tts.enabled}`);

    // Wait if we have too many concurrent requests
    while (activeTTSRequests >= MAX_CONCURRENT_TTS) {
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    activeTTSRequests++;
    console.log(`⏳ S${index + 1} TTS request started... (active: ${activeTTSRequests})`);

    try {

        const detectedLang = detectLanguageFromText(text);
        const langConfig = TTS_LANGUAGES[detectedLang] || TTS_LANGUAGES['en'];
        console.log(`🎙️ S${index + 1} detected language: ${detectedLang}`);

        let audioData = null;

        // Edge TTS (FREE) -> ElevenLabs (PAID) -> Google (fallback)
        if (CONFIG.tts.provider === "edge") {
            console.log(`🎙️ S${index + 1} using Edge TTS`);
            audioData = await generateEdgeTTS(text, langConfig);
            if (!audioData) {
                console.warn("⚠️ Edge TTS failed, trying ElevenLabs");
                audioData = await generateElevenLabsTTS(text, langConfig);
            }
        } else if (CONFIG.tts.provider === "elevenlabs") {
            console.log(`🎙️ S${index + 1} using ElevenLabs TTS`);
            audioData = await generateElevenLabsTTS(text, langConfig);
        } else {
            console.log(`🎙️ S${index + 1} using Google TTS`);
            audioData = await generateGoogleTTS(text, langConfig);
        }

        const elapsed = Date.now() - startTime;
        console.log(`✅ S${index + 1} TTS ready in ${elapsed}ms, audioData:`, audioData ? { hasData: !!audioData.data, mimeType: audioData.mimeType } : null);

        return { index, audioData, text };

    } catch (error) {
        console.error(`❌ S${index + 1} TTS failed:`, error);
        console.error(`❌ S${index + 1} Error details:`, error.message, error.stack);
        return { index, audioData: null, text };
    } finally {
        activeTTSRequests--;
    }
}


async function playTTSAudiosInOrder(ttsPromises) {
    console.log("🔊 playTTSAudiosInOrder called with", ttsPromises.length, "promises");
    const totalCount = ttsPromises.length;
    const audioResults = new Array(totalCount).fill(null); // Pre-allocate array
    let resolvedCount = 0;
    let currentPlayIndex = 0;
    let isPlaying = false;
    let playbackComplete = false;

    // Reset global abort flag
    shouldAbortPlayback = false;

    isSpeaking = true;

    // 🎤 DON'T stop mic - allow user to interrupt!
    // Keep mic running so user can interrupt teacher at any time
    // The recognition.onresult handler will stop playback if user speaks
    console.log("🔊 Teacher speaking (mic stays ON for interruption)");

    // Make eye contact while speaking
    if (head) {
        TeacherBehavior.makeEyeContact(10000);
    }


    async function playNextAudio() {
        console.log(`🔊 playNextAudio: currentPlayIndex=${currentPlayIndex}, isPlaying=${isPlaying}, playbackComplete=${playbackComplete}, shouldAbort=${shouldAbortPlayback}`);
        if (isPlaying || playbackComplete || shouldAbortPlayback) {
            console.log(`🔊 playNextAudio skipped: isPlaying=${isPlaying}, playbackComplete=${playbackComplete}, shouldAbort=${shouldAbortPlayback}`);
            return;
        }

        // Check if current index is ready
        if (audioResults[currentPlayIndex] !== null) {
            const result = audioResults[currentPlayIndex];
            console.log(`🔊 S${currentPlayIndex + 1} result:`, result ? { hasAudioData: !!result.audioData, text: result.text?.substring(0, 30) } : null);

            if (result.audioData && !shouldAbortPlayback) {
                isPlaying = true;
                console.log(`▶️ Playing S${currentPlayIndex + 1}...`);

                if (head) {
                    console.log("🔊 Calling playAudioWithLipSync...");
                    await playAudioWithLipSync(result.audioData);
                    console.log("🔊 playAudioWithLipSync completed");
                } else {
                    console.log("🔊 No head, calling playAudioDirect...");
                    await playAudioDirect(result.audioData);
                }

                isPlaying = false;
            } else {
                console.log(`🔊 S${currentPlayIndex + 1} skipped: audioData=${!!result.audioData}, shouldAbort=${shouldAbortPlayback}`);
            }

            currentPlayIndex++;


            if (currentPlayIndex < totalCount && !shouldAbortPlayback) {
                console.log(`🔊 Moving to next audio, currentPlayIndex now ${currentPlayIndex}`);
                playNextAudio();
            } else {
                // All done
                console.log(`🔊 All audios processed, finishing playback`);
                playbackComplete = true;
                finishPlayback();
            }
        } else {
            console.log(`🔊 S${currentPlayIndex + 1} not ready yet (audioResults[${currentPlayIndex}] is null)`);
        }

    }


    function finishPlayback() {
        // Return to idle
        if (head) {
            TeacherBehavior.startIdleBehavior();
        }

        isSpeaking = false;
        console.log("✅ Teacher done speaking (mic remains active)");
    }


    ttsPromises.forEach((promise, index) => {
        promise.then(result => {
            console.log(`🔊 Promise ${index} resolved:`, result ? { index: result.index, hasAudioData: !!result.audioData } : null);
            audioResults[result.index] = result;
            resolvedCount++;

            console.log(`📦 S${result.index + 1} audio received (${resolvedCount}/${totalCount})`);


            if (result.index === currentPlayIndex && !isPlaying && !playbackComplete) {
                playNextAudio();
            }
        }).catch(err => {
            console.error(`❌ TTS promise ${index} failed:`, err);
            audioResults[index] = { index, audioData: null, text: '' };
            resolvedCount++;

            // Still try to advance playback
            if (index === currentPlayIndex && !isPlaying && !playbackComplete) {
                currentPlayIndex++;
                playNextAudio();
            }
        });
    });


    return new Promise(resolve => {
        const checkComplete = setInterval(() => {
            if (playbackComplete) {
                clearInterval(checkComplete);
                resolve();
            }
        }, 100);
    });
}


// Speech Queue System - Non-blocking audio playback


const speechQueue = [];
let isSpeaking = false;
let isPaused = false;
let currentAudioSource = null;
let shouldAbortPlayback = false; // Global abort flag for parallel TTS

function queueSpeech(text) {
    if (!text.trim()) return;
    speechQueue.push(text);
    // Start processing without waiting (non-blocking)
    processSpeechQueue();
}


function stopSpeech() {
    console.log("⏹️ Stopping speech...");

    // Abort any parallel TTS playback in progress
    shouldAbortPlayback = true;

    speechQueue.length = 0;

    // Stop TalkingHead avatar speech
    if (head) {
        head.stopSpeaking();
        TeacherBehavior.startIdleBehavior();
    }


    if (currentAudioSource) {
        try {
            currentAudioSource.stop();
        } catch (e) {

        }
        currentAudioSource = null;
    }

    isSpeaking = false;
    isPaused = false;

    // Update stop button
    const stopBtn = document.getElementById("stop-btn");
    if (stopBtn) {
        stopBtn.innerHTML = '<span>⏹️</span>';
        stopBtn.classList.remove("active");
    }

    addMessageToChat("⏹️ Teacher stopped speaking.", "system");
}


function togglePauseSpeech() {
    if (!isSpeaking) return;

    isPaused = !isPaused;

    if (isPaused) {
        console.log("⏸️ Pausing speech...");
        if (head) {
            head.stopSpeaking();
        }
        addMessageToChat("⏸️ Paused. Click again to resume.", "system");


        const stopBtn = document.getElementById("stop-btn");
        if (stopBtn) {
            stopBtn.innerHTML = '<span>▶️</span>';
            stopBtn.classList.add("paused");
        }
    } else {
        console.log("▶️ Resuming speech...");
        addMessageToChat("▶️ Resuming...", "system");

        // Update button back
        const stopBtn = document.getElementById("stop-btn");
        if (stopBtn) {
            stopBtn.innerHTML = '<span>⏹️</span>';
            stopBtn.classList.remove("paused");
        }


        processSpeechQueue();
    }
}


function interruptForNewMessage() {
    if (isSpeaking) {
        console.log("🔄 Interrupting for new message...");

        // Clear current queue
        speechQueue.length = 0;


        if (head) {
            head.stopSpeaking();
        }

        if (currentAudioSource) {
            try {
                currentAudioSource.stop();
            } catch (e) { }
            currentAudioSource = null;
        }

        isSpeaking = false;
        isPaused = false;
    }
}


let micWasOnBeforeSpeech = false;

async function processSpeechQueue() {
    if (isSpeaking || speechQueue.length === 0 || isPaused) return;

    isSpeaking = true;

    // PAUSE mic completely while teacher speaks (avoids ANY echo pickup)
    if (isRecording && recognition) {
        micWasOnBeforeSpeech = true;
        recognition.stop();
        console.log("🔇 Mic paused while teacher speaks");
    }

    while (speechQueue.length > 0) {
        const text = speechQueue.shift();
        try {
            await speakTextNonBlocking(text);
        } catch (e) {
            console.error("Speech queue error:", e);
        }
    }


    await new Promise(resolve => setTimeout(resolve, 500));

    isSpeaking = false;


    if (micWasOnBeforeSpeech) {
        micWasOnBeforeSpeech = false;
        console.log("🎙️ Teacher done - restarting mic...");
        startVoiceInput();
    }
}

// ===========================================


// ===========================================
let audioContextResumed = false;

async function speakText(text) {

    queueSpeech(text);
}


async function speakTextWithParallelTTS(text) {
    if (!text.trim() || !CONFIG.tts.enabled) return;

    // Resume AudioContext on first user interaction
    if (!audioContextResumed && head?.audioContext) {
        try {
            await head.audioContext.resume();
            audioContextResumed = true;
        } catch (e) {
            console.warn("⚠️ Could not resume AudioContext:", e);
        }
    }


    const cleanText = text
        .replace(/```[\s\S]*?```/g, "")
        .replace(/`[^`]+`/g, "")
        .replace(/\*\*([^*]+)\*\*/g, "$1")
        .replace(/\*([^*]+)\*/g, "$1")
        .replace(/#{1,6}\s/g, "")
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
        .replace(/[_~]/g, "")
        .trim();

    if (!cleanText) return;

    // Split into sentences (supports Bengali ।)
    const sentenceRegex = /[^.!?।]+[.!?।]+/g;
    const sentences = cleanText.match(sentenceRegex) || [cleanText];

    console.log(`🎵 Parallel TTS: ${sentences.length} sentences`);

    // Start TTS requests in parallel (respecting rate limit)
    const ttsPromises = sentences.map((sentence, index) => {
        const trimmed = sentence.trim();
        if (trimmed.length < 2) return Promise.resolve({ index, audioData: null, text: trimmed });
        return fetchTTSAudio(trimmed, index);
    });

    // Play in order as each becomes ready
    await playTTSAudiosInOrder(ttsPromises);
}

async function speakTextNonBlocking(text) {
    if (!text.trim() || !CONFIG.tts.enabled) return;

    // Resume AudioContext on first user interaction (browser requirement)
    if (!audioContextResumed && head?.audioContext) {
        try {
            await head.audioContext.resume();
            audioContextResumed = true;
            console.log("✅ AudioContext resumed after user interaction");
        } catch (e) {
            console.warn("⚠️ Could not resume AudioContext:", e);
        }
    }

    // Clean text for TTS (remove markdown)
    const cleanText = text
        .replace(/```[\s\S]*?```/g, "") // Remove code blocks
        .replace(/`[^`]+`/g, "")
        .replace(/\*\*([^*]+)\*\*/g, "$1") // Remove bold
        .replace(/\*([^*]+)\*/g, "$1")
        .replace(/#{1,6}\s/g, "")
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // Remove links
        .replace(/[_~]/g, "")
        .trim();

    if (!cleanText) return;

    try {

        const detectedLang = detectLanguageFromText(cleanText);
        const langConfig = TTS_LANGUAGES[detectedLang] || TTS_LANGUAGES['en'];

        console.log("🌍 Detected language:", langConfig.name);

        // Make eye contact while speaking for realism
        if (head) {
            TeacherBehavior.makeEyeContact(cleanText.length * 50 + 2000);
        }


        let audioData;
        if (CONFIG.tts.provider === "google") {
            // Google TTS PRIMARY with Edge TTS fallback
            try {
                audioData = await generateGoogleTTS(cleanText, langConfig);
                if (!audioData) {
                    console.warn("⚠️ Google TTS returned null, falling back to Edge TTS");
                    audioData = await generateEdgeTTS(cleanText, langConfig);
                }
            } catch (error) {
                console.warn("⚠️ Google TTS failed, falling back to Edge TTS", error);
                try {
                    audioData = await generateEdgeTTS(cleanText, langConfig);
                } catch (error2) {
                    console.warn("⚠️ Edge TTS also failed, using ElevenLabs", error2);
                    audioData = await generateElevenLabsTTS(cleanText, langConfig);
                }
            }
        } else if (CONFIG.tts.provider === "edge") {
            try {
                audioData = await generateEdgeTTS(cleanText, langConfig);
                // If Edge TTS returns null, fall back to ElevenLabs
                if (!audioData) {
                    console.warn("⚠️ Edge TTS returned null, falling back to ElevenLabs");
                    audioData = await generateElevenLabsTTS(cleanText, langConfig);
                }
            } catch (error) {
                console.warn("⚠️ Edge TTS failed, falling back to ElevenLabs", error);
                try {
                    audioData = await generateElevenLabsTTS(cleanText, langConfig);
                } catch (error2) {
                    console.warn("⚠️ ElevenLabs also failed, using Google TTS", error2);
                    audioData = await generateGoogleTTS(cleanText, langConfig);
                }
            }
        } else if (CONFIG.tts.provider === "elevenlabs") {
            try {
                audioData = await generateElevenLabsTTS(cleanText, langConfig);
            } catch (error) {
                console.warn("⚠️ ElevenLabs failed, falling back to Google TTS", error);
                audioData = await generateGoogleTTS(cleanText, langConfig);
            }
        } else {
            audioData = await generateGoogleTTS(cleanText, langConfig);
        }

        if (audioData && head) {

            await playAudioWithLipSync(audioData);
        } else if (audioData) {
            // Fallback: play audio directly if no avatar
            playAudioDirect(audioData);
        }


        if (head) {
            setTimeout(() => {
                TeacherBehavior.startIdleBehavior();
            }, 500);
        }

    } catch (error) {
        console.error(`TTS Error (${CONFIG.tts.provider}):`, error);

        fallbackBrowserTTS(cleanText);
    }
}

// ===========================================


// ===========================================
async function generateGoogleTTS(text, langConfig) {
    const googleConfig = langConfig.google || TTS_LANGUAGES['en'].google;
    const teacherGender = CONFIG.currentTeacher || 'male';

    // Get language code (e.g., 'en-US', 'bn-IN')
    const langCode = googleConfig.code || 'en-US';

    // Chirp3-HD voices require language code prefix to match
    // e.g., bn-IN-Chirp3-HD-Aoede for Bengali, en-US-Chirp3-HD-Aoede for English
    const voiceName = teacherGender === 'male' ? 'Orus' : 'Aoede';
    const selectedVoice = `${langCode}-Chirp3-HD-${voiceName}`;

    const body = {
        input: { text: text },
        voice: {
            languageCode: langCode,
            name: selectedVoice
        },
        audioConfig: {
            audioEncoding: "MP3",
            speakingRate: CONFIG.tts.speakingRate,
            pitch: CONFIG.tts.pitch
        }
    };

    console.log("🔊 Google TTS request:", langConfig.name, "| Voice:", selectedVoice, "| Teacher:", teacherGender);

    try {
        let response;
        if (CONFIG.isProduction) {
            // Use serverless Google TTS API in production
            console.log("📡 Using serverless Google TTS API");
            response = await fetch(CONFIG.apiEndpoints.googleTts, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    text: text,
                    languageCode: googleConfig.code,
                    voiceName: selectedVoice,
                    speakingRate: CONFIG.tts.speakingRate,
                    pitch: CONFIG.tts.pitch
                })
            });
        } else {
            // Direct API call for local development
            const url = `${CONFIG.googleTTSEndpoint}?key=${CONFIG.geminiApiKey}`;
            response = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(body)
            });
        }

        if (!response) return null;

        console.log("🔊 TTS Response status:", response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error("❌ Google TTS API Error:", errorText);
            throw new Error(`Google TTS Error: ${response.status}`);
        }

        const data = await response.json();

        if (data.audioContent) {
            console.log("✅ Google TTS Audio received | Size:", data.audioContent.length);
            return {
                data: data.audioContent,
                mimeType: 'audio/mp3'
            };
        }

        console.warn("⚠️ No audio data in Google TTS response");
        return null;

    } catch (error) {
        console.error("❌ Google TTS fetch error:", error);
        throw error;
    }
}

// ===========================================


// Using fetch API (browser-compatible)

// Edge TTS Generation (FREE, 100+ countries with emotions)
// Simple direct fetch - no sentence splitting, full text at once
async function generateEdgeTTS(text, langConfig) {
    try {
        // Get language code from config
        const configLangCode = langConfig.google?.code || 'en-US';

        // Auto-detect language from text script
        const detectedLang = detectTextLanguage(text);

        // Use detected language if different from config, otherwise use config/settings
        const langCode = detectedLang || configLangCode;

        // Get teacher gender (male/female) for voice selection
        const teacherGender = CONFIG.currentTeacher === 'male' ? 'male' : 'female';

        // Determine the voice to use:
        // 1. If language was auto-detected (different script), use that language's default voice
        // 2. Otherwise use user's settings voice (CONFIG.tts.edgeVoice)
        // 3. Fallback to getEdgeTTSVoice helper
        let selectedVoice;

        if (detectedLang && EDGE_TTS_VOICES[detectedLang]) {
            // Auto-detected different language - use its default voice
            selectedVoice = EDGE_TTS_VOICES[detectedLang][teacherGender];
            console.log(`🌐 Auto-selected voice for ${detectedLang}: ${selectedVoice}`);
        } else if (CONFIG.tts.edgeVoice) {
            // Use settings voice
            selectedVoice = CONFIG.tts.edgeVoice;
        } else {
            // Fallback
            selectedVoice = getEdgeTTSVoice(langCode, teacherGender);
        }

        // Emotion only works with English voices
        const isEnglish = selectedVoice.startsWith('en-');
        const emotion = isEnglish ? CONFIG.tts.edgeEmotion : null;

        const voiceLang = EDGE_TTS_VOICES[langCode]?.name || langCode;
        console.log("🎙️ Edge TTS:", voiceLang, "| Voice:", selectedVoice, "| Teacher:", teacherGender, "| Emotion:", emotion || 'neutral');

        // Direct fetch to Edge TTS API - returns binary audio
        const response = await fetch('/api/edge-tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: text,
                voice: selectedVoice,  // Send specific HD voice
                emotion: emotion,
                includeTimings: false  // Get audio directly, not JSON
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Edge TTS failed');
        }

        // Response is binary audio
        const audioBuffer = await response.arrayBuffer();
        const base64Audio = arrayBufferToBase64(audioBuffer);

        console.log("✅ Edge TTS Audio generated | Size:", audioBuffer.byteLength, "bytes");

        return {
            data: base64Audio,
            mimeType: 'audio/mpeg'
        };

    } catch (error) {
        console.error("❌ Edge TTS Error:", error);
        return null; // Return null instead of throwing to allow fallback
    }
}

// ElevenLabs TTS Generation (Paid, High Quality)
async function generateElevenLabsTTS(text, langConfig) {

    // This ensures female teacher uses Rachel voice, male uses Adam voice
    const voiceId = CONFIG.tts.elevenLabsVoice;

    const shortCode = langConfig.google?.code?.split('-')[0] || 'en';

    // Use eleven_multilingual_v2 for other languages
    const isBengali = shortCode === 'bn';
    const modelId = isBengali ? 'eleven_v3' : 'eleven_multilingual_v2';

    console.log("🎙️ ElevenLabs TTS:", langConfig.name, "| Model:", modelId, "| Voice:", voiceId, "| Teacher:", CONFIG.currentTeacher);


    const requestBody = {
        text: text,
        model_id: modelId,
        voice_settings: {
            stability: CONFIG.tts.stability,
            similarity_boost: CONFIG.tts.similarityBoost
        }
    };

    try {
        let response;

        if (CONFIG.isProduction) {
            // Use serverless API in production
            console.log("📡 Using serverless TTS API");
            response = await fetch(CONFIG.apiEndpoints.tts, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    text: text,
                    voiceId: voiceId,
                    modelId: modelId,
                    voiceSettings: requestBody.voice_settings
                })
            });
        } else {
            // Direct API call for local development
            const url = `${CONFIG.elevenLabsEndpoint}/text-to-speech/${voiceId}`;
            response = await fetch(url, {
                method: "POST",
                headers: {
                    "Accept": "audio/mpeg",
                    "Content-Type": "application/json",
                    "xi-api-key": CONFIG.elevenLabsApiKey
                },
                body: JSON.stringify(requestBody)
            });
        }

        console.log("🎙️ TTS Response status:", response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error("❌ ElevenLabs API Error:", errorText);
            throw new Error(`ElevenLabs TTS Error: ${response.status}`);
        }

        // Handle response based on environment
        if (CONFIG.isProduction) {
            // Serverless returns JSON with base64 audio
            const data = await response.json();
            if (data.audio) {
                console.log("✅ ElevenLabs Audio received (serverless)");
                return {
                    data: data.audio,
                    mimeType: data.contentType || 'audio/mpeg'
                };
            }
        } else {
            // Direct API returns ArrayBuffer
            // Get character cost from headers
            const charCount = response.headers.get('x-character-count');
            const requestId = response.headers.get('request-id');
            if (charCount) {
                console.log("💰 Character cost:", charCount, "| Request ID:", requestId);
            }

            const audioBuffer = await response.arrayBuffer();
            if (audioBuffer && audioBuffer.byteLength > 0) {
                console.log("✅ ElevenLabs Audio received | Size:", audioBuffer.byteLength, "bytes");
                const base64Audio = arrayBufferToBase64(audioBuffer);
                return {
                    data: base64Audio,
                    mimeType: 'audio/mpeg'
                };
            }
        }

        console.warn("⚠️ No audio data in ElevenLabs response");
        return null;

    } catch (error) {
        console.error("❌ ElevenLabs TTS fetch error:", error);
        throw error;
    }
}


function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}


// Play Audio with TalkingHead Lip-Sync


async function playAudioWithLipSync(audioData) {
    console.log("🔊 playAudioWithLipSync called");
    console.log("🔊 audioData:", audioData ? { hasData: !!audioData.data, mimeType: audioData.mimeType, dataLength: audioData.data?.length } : null);
    console.log("🔊 head available:", !!head);

    if (!head) {
        console.log("⚠️ No head avatar, playing direct audio");
        playAudioDirect(audioData);
        return;
    }

    if (!audioData || !audioData.data) {
        console.error("❌ No audio data provided to playAudioWithLipSync");
        return;
    }

    try {
        console.log("🎤 Playing audio with lip-sync...");

        // Convert base64 to ArrayBuffer
        const binaryString = atob(audioData.data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        console.log("🔊 Audio bytes length:", bytes.length);

        // Get or create audio context
        let audioContext = head.audioCtx;
        if (!audioContext) {
            console.log("🔊 Creating new AudioContext (head.audioCtx was null)");
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }

        // CRITICAL: Resume audio context if suspended (browser autoplay policy)
        if (audioContext.state === 'suspended') {
            console.log("🔊 AudioContext was suspended, resuming...");
            await audioContext.resume();
            console.log("🔊 AudioContext resumed, state:", audioContext.state);
        }
        console.log("🔊 AudioContext state:", audioContext.state);

        const audioBuffer = await audioContext.decodeAudioData(bytes.buffer.slice(0));
        console.log("🎤 Audio decoded:", audioBuffer.duration, "seconds, channels:", audioBuffer.numberOfChannels, "sampleRate:", audioBuffer.sampleRate);

        // This creates basic mouth movement synced to audio
        const duration = audioBuffer.duration * 1000;
        const wordCount = Math.ceil(duration / 200);
        const words = [];
        const wtimes = [];
        const wdurations = [];

        for (let i = 0; i < wordCount; i++) {
            words.push("a"); // Use 'a' for open mouth viseme
            wtimes.push(i * 200);
            wdurations.push(150);
        }

        const talkingHeadAudio = {
            audio: audioBuffer,
            words: words,
            wtimes: wtimes,
            wdurations: wdurations
        };

        console.log("🔊 Calling head.speakAudio with", wordCount, "word markers");
        head.speakAudio(talkingHeadAudio, { lipsyncLang: 'en' });
        console.log("✅ Lip-sync playback started, waiting", duration + 500, "ms");

        // Wait for audio to finish
        return new Promise((resolve) => {
            setTimeout(() => {
                console.log("🔊 Audio playback timeout completed");
                resolve();
            }, duration + 500);
        });

    } catch (error) {
        console.error("❌ Lip-sync playback error:", error);
        console.error("❌ Error stack:", error.stack);

        // Try fallback
        console.log("🔊 Trying fallback playAudioWithAnimation...");
        playAudioWithAnimation(audioData);
    }
}


// Play Audio with Visual Animation (fallback)

async function playAudioWithAnimation(audioData) {
    try {
        console.log("🔊 Audio playback with animation...");

        const binaryString = atob(audioData.data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        const mimeType = audioData.mimeType || 'audio/wav';
        const audioBlob = new Blob([bytes], { type: mimeType });
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);


        audio.onplay = () => {
            console.log("▶️ Audio playing with animation");
            if (head) {
                // Start talking animation
                head.setMood('happy');
                startTalkingAnimation();
            }
        };

        audio.onended = () => {
            console.log("⏹️ Audio ended");
            URL.revokeObjectURL(audioUrl);
            if (head) {
                stopTalkingAnimation();
                head.setMood('neutral');
            }
        };

        audio.onerror = (e) => console.error("❌ Audio error:", e);

        await audio.play();

    } catch (error) {
        console.error("❌ Audio with animation error:", error);
        playAudioDirect(audioData);
    }
}


let talkingAnimationInterval = null;

function startTalkingAnimation() {
    if (talkingAnimationInterval) return;


    talkingAnimationInterval = setInterval(() => {
        if (head && head.setMorphTargetValue) {
            // Alternate mouth open/close for talking effect
            const openAmount = 0.3 + Math.random() * 0.4;
            head.setMorphTargetValue('mouthOpen', openAmount);
        }
    }, 100);
}

function stopTalkingAnimation() {
    if (talkingAnimationInterval) {
        clearInterval(talkingAnimationInterval);
        talkingAnimationInterval = null;


        if (head && head.setMorphTargetValue) {
            head.setMorphTargetValue('mouthOpen', 0);
        }
    }
}


// Direct Audio Playback (without lip-sync)

async function playAudioDirect(audioData) {
    return new Promise((resolve, reject) => {
        try {
            console.log("🔊 Direct audio playback...");

            const binaryString = atob(audioData.data);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }

            const mimeType = audioData.mimeType || 'audio/wav';
            const audioBlob = new Blob([bytes], { type: mimeType });
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);

            audio.onplay = () => console.log("▶️ Audio playing");
            audio.onended = () => {
                console.log("⏹️ Audio ended");
                URL.revokeObjectURL(audioUrl);
                resolve();
            };
            audio.onerror = (e) => {
                console.error("❌ Audio error:", e);
                reject(e);
            };

            audio.play().catch(err => {
                console.error("❌ Audio play failed:", err);
                reject(err);
            });

        } catch (error) {
            console.error("❌ Direct audio playback error:", error);
            reject(error);
        }
    });
}

// ===========================================


function fallbackBrowserTTS(text) {
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        speechSynthesis.speak(utterance);
    }
}

// ===========================================


function getStudentLanguage() {
    if (studentProfile?.language) {
        // Extract language code (e.g., 'en-US' -> 'en', 'bn-BD' -> 'bn')
        const code = studentProfile.language.split('-')[0].toLowerCase();
        return code;
    }


    if (studentProfile?.country) {
        const countryLangMap = {

            'bangladesh': 'bn',
            'india': 'hi',
            'pakistan': 'ur',
            'nepal': 'hi',
            'sri_lanka': 'ta',
            'bhutan': 'hi',
            'maldives': 'en',

            // Southeast Asia
            'indonesia': 'id',
            'malaysia': 'ms',
            'singapore': 'en',
            'thailand': 'th',
            'vietnam': 'vi',
            'philippines': 'en',
            'myanmar': 'en',
            'cambodia': 'en',


            'japan': 'ja',
            'korea': 'ko',
            'south_korea': 'ko',
            'china': 'zh',
            'taiwan': 'zh',
            'hong_kong': 'zh',


            'saudi_arabia': 'ar',
            'uae': 'ar',
            'united_arab_emirates': 'ar',
            'qatar': 'ar',
            'kuwait': 'ar',
            'bahrain': 'ar',
            'oman': 'ar',
            'egypt': 'ar',
            'jordan': 'ar',
            'iraq': 'ar',
            'syria': 'ar',
            'lebanon': 'ar',
            'yemen': 'ar',
            'iran': 'fa',
            'israel': 'he',
            'turkey': 'tr',

            // Europe
            'uk': 'en',
            'united_kingdom': 'en',
            'usa': 'en',
            'united_states': 'en',
            'canada': 'en',
            'australia': 'en',
            'new_zealand': 'en',
            'ireland': 'en',
            'spain': 'es',
            'mexico': 'es',
            'argentina': 'es',
            'colombia': 'es',
            'chile': 'es',
            'peru': 'es',
            'venezuela': 'es',
            'france': 'fr',
            'germany': 'de',
            'austria': 'de',
            'switzerland': 'de',
            'italy': 'it',
            'portugal': 'pt',
            'brazil': 'pt',
            'russia': 'ru',
            'poland': 'pl',
            'netherlands': 'nl',
            'belgium': 'nl',
            'greece': 'en',
            'sweden': 'en',
            'norway': 'en',
            'denmark': 'en',
            'finland': 'en',


            'nigeria': 'en',
            'south_africa': 'en',
            'kenya': 'en',
            'ghana': 'en',
            'ethiopia': 'en',
            'morocco': 'ar',
            'algeria': 'ar',
            'tunisia': 'ar',
            'libya': 'ar'
        };
        return countryLangMap[studentProfile.country] || 'en';
    }

    return 'en';
}

// ===========================================



// Available Gemini TTS voices with their characteristics
const TTS_VOICES = {

    'Kore': { gender: 'female', style: 'warm, friendly' },
    'Leda': { gender: 'female', style: 'young, energetic' },
    'Aoede': { gender: 'female', style: 'soft, calm' },
    'Despina': { gender: 'female', style: 'clear, articulate' },
    'Erinome': { gender: 'female', style: 'bright, cheerful' },
    'Callirhoe': { gender: 'female', style: 'mature, professional' },


    'Puck': { gender: 'male', style: 'friendly, conversational' },
    'Charon': { gender: 'male', style: 'deep, authoritative' },
    'Fenrir': { gender: 'male', style: 'strong, confident' },
    'Orus': { gender: 'male', style: 'warm, reassuring' },
    'Enceladus': { gender: 'male', style: 'clear, professional' },
    'Iapetus': { gender: 'male', style: 'mature, wise' },

    // Neutral/versatile voices
    'Zephyr': { gender: 'neutral', style: 'light, airy' },
    'Umbriel': { gender: 'neutral', style: 'mysterious, thoughtful' },
    'Algieba': { gender: 'neutral', style: 'balanced, natural' },
    'Autonoe': { gender: 'neutral', style: 'expressive' }
};


function setTTSLanguage(langCode) {
    if (TTS_LANGUAGES[langCode]) {
        CONFIG.tts.language = langCode;
        console.log(`🌍 TTS Language set to: ${TTS_LANGUAGES[langCode].name}`);
        return true;
    }
    console.warn(`Language code '${langCode}' not supported`);
    return false;
}


function setTTSVoice(voiceName) {
    if (TTS_VOICES[voiceName]) {
        CONFIG.tts.voice = voiceName;
        console.log(`🎤 TTS Voice set to: ${voiceName} (${TTS_VOICES[voiceName].style})`);
        return true;
    }
    console.warn(`Voice '${voiceName}' not available`);
    return false;
}

/**
 * Set TTS speaking style
 * @param {string} style - Speaking style description (e.g., 'warm and encouraging', 'energetic')
 */
function setTTSStyle(style) {
    CONFIG.tts.style = style;
    console.log(`🎭 TTS Style set to: ${style}`);
}


function getAvailableTTSLanguages() {
    return TTS_LANGUAGES;
}


function getAvailableTTSVoices() {
    return TTS_VOICES;
}

/**
 * Test TTS with current settings
 * @param {string} testText - Text to speak (optional)
 */
async function testTTS(testText = null) {
    const langCode = CONFIG.tts.language;
    const lang = TTS_LANGUAGES[langCode] || TTS_LANGUAGES['en'];

    const defaultTests = {
        'bn': 'আমি তোমার শিক্ষক। আমি তোমাকে শিখতে সাহায্য করব।',
        'hi': 'मैं आपका शिक्षक हूं। मैं आपको सीखने में मदद करूंगा।',
        'ar': 'أنا معلمك. سأساعدك على التعلم.',
        'es': '¡Hola! Soy tu profesora. Voy a ayudarte a aprender.',
        'fr': 'Bonjour! Je suis votre professeur. Je vais vous aider à apprendre.',
        'de': 'Hallo! Ich bin dein Lehrer. Ich werde dir beim Lernen helfen.',
        'ja': 'こんにちは！私はあなたの先生です。学習のお手伝いをします。',
        'ko': '안녕하세요! 저는 당신의 선생님입니다. 학습을 도와드리겠습니다.',
        'zh': '你好！我是你的老师。我会帮助你学习。',
        'en': 'Hello! I am your teacher. I will help you learn and succeed.'
    };

    const text = testText || defaultTests[langCode] || defaultTests['en'];
    console.log(`🔊 Testing TTS in ${lang.name}: "${text}"`);

    await speakText(text);
}



// ===========================================
function findSentenceEnd(text) {
    let maxIndex = 0;
    [". ", "! ", "? ", "\n\n"].forEach(delimiter => {
        const idx = text.lastIndexOf(delimiter);
        if (idx > maxIndex) maxIndex = idx + delimiter.length;
    });
    return maxIndex;
}


function cleanTextForTTS(text) {
    if (!text) return '';

    let clean = text

        .replace(/[\u{1F600}-\u{1F64F}]/gu, '') // Emoticons
        .replace(/[\u{1F300}-\u{1F5FF}]/gu, '')
        .replace(/[\u{1F680}-\u{1F6FF}]/gu, '')
        .replace(/[\u{1F700}-\u{1F77F}]/gu, '') // Alchemical Symbols
        .replace(/[\u{1F780}-\u{1F7FF}]/gu, '')
        .replace(/[\u{1F800}-\u{1F8FF}]/gu, '')
        .replace(/[\u{1F900}-\u{1F9FF}]/gu, '') // Supplemental Symbols and Pictographs
        .replace(/[\u{1FA00}-\u{1FA6F}]/gu, '')
        .replace(/[\u{1FA70}-\u{1FAFF}]/gu, '')
        .replace(/[\u{2600}-\u{26FF}]/gu, '')   // Misc symbols (sun, moon, etc)
        .replace(/[\u{2700}-\u{27BF}]/gu, '')
        .replace(/[\u{FE00}-\u{FE0F}]/gu, '')
        .replace(/[\u{1F000}-\u{1F02F}]/gu, '') // Mahjong Tiles
        .replace(/[\u{1F0A0}-\u{1F0FF}]/gu, '')

        .replace(/```[\s\S]*?```/g, '')
        // Remove inline code
        .replace(/`[^`]+`/g, '')
        // Remove markdown headers
        .replace(/#{1,6}\s*/g, '')
        // Remove bold/italic markers
        .replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1')
        .replace(/_{1,3}([^_]+)_{1,3}/g, '$1')
        // Remove links - keep text
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        // Remove bullet points
        .replace(/^[\s]*[-*+]\s*/gm, '')
        // Remove numbered lists markers
        .replace(/^[\s]*\d+\.\s*/gm, '')
        // Remove multiple newlines
        .replace(/\n{3,}/g, '\n\n')
        // Remove extra spaces
        .replace(/\s{2,}/g, ' ')
        .trim();

    // Limit length for TTS (very long text can fail or be slow)
    if (clean.length > 2000) {
        // Find a good break point
        const breakPoint = clean.lastIndexOf('.', 2000);
        if (breakPoint > 1500) {
            clean = clean.substring(0, breakPoint + 1);
        } else {
            clean = clean.substring(0, 2000) + '...';
        }
    }

    return clean;
}

// ===========================================
// Add Message to Chat
// ===========================================
function addMessageToChat(content, type, shouldSave = true) {
    const messageDiv = document.createElement("div");
    messageDiv.className = `message ${type}`;

    const contentDiv = document.createElement("div");
    contentDiv.className = "message-content";

    if (type === "teacher" && content) {
        contentDiv.innerHTML = dompurify.sanitize(marked.parse(content));
    } else if (type === "system") {
        contentDiv.innerHTML = `<p class="system-message">${content}</p>`;
    } else {
        contentDiv.innerHTML = `<p>${escapeHtml(content)}</p>`;
    }

    messageDiv.appendChild(contentDiv);
    elements.chatMessages.appendChild(messageDiv);
    elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;

    // Track message for chat history (not system messages)
    if (shouldSave && type !== "system" && content) {
        currentChatMessages.push({
            role: type === "user" ? "user" : "model",
            content: content,
            timestamp: new Date().toISOString()
        });

        // Auto-save after a short delay (debounced)
        clearTimeout(window.autoSaveTimeout);
        window.autoSaveTimeout = setTimeout(() => {
            autoSaveChat();
        }, 2000);
    }

    return messageDiv;
}

// ===========================================
// Add Typing Indicator
// ===========================================
function addTypingIndicator() {
    const typingDiv = document.createElement("div");
    typingDiv.className = "message teacher";
    typingDiv.innerHTML = `
    <div class="message-content">
      <div class="typing-indicator">
        <span></span>
        <span></span>
        <span></span>
      </div>
    </div>
  `;
    elements.chatMessages.appendChild(typingDiv);
    elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
    return typingDiv;
}

// ===========================================
// Update Status
// ===========================================
function updateStatus(status) {
    const container = document.getElementById("connection-status");
    const indicator = container?.querySelector(".status-dot");
    const text = container?.querySelector(".status-text");

    // Guard against null elements
    if (!indicator || !text) {
        console.warn("Status elements not found");
        return;
    }

    // Reset inline styles first
    indicator.style.background = "";
    indicator.style.boxShadow = "";

    switch (status) {
        case "online":
            container.className = "connection-indicator online";
            text.textContent = "Online";
            break;
        case "thinking":
            container.className = "connection-indicator thinking";
            indicator.style.background = "var(--accent-warning, #f59e0b)";
            indicator.style.boxShadow = "0 0 8px var(--accent-warning, #f59e0b)";
            text.textContent = "Thinking...";
            break;
        case "speaking":
            container.className = "connection-indicator speaking";
            indicator.style.background = "var(--accent-primary, #3b82f6)";
            indicator.style.boxShadow = "0 0 8px var(--accent-primary, #3b82f6)";
            text.textContent = "Speaking...";
            break;
    }
}

// ===========================================
// Update Mood Based on Content (Automatic) - Using TeacherBehavior
// ===========================================
function updateMoodBasedOnContent(content) {
    if (!head) return;

    // Use the TeacherBehavior system for smart mood detection
    const detectedMood = TeacherBehavior.detectAndSetMood(content);

    // Add gesture based on content type
    const lowerContent = content.toLowerCase();

    // Happy/Approval - thumbs up
    if (['happy'].includes(detectedMood)) {
        if (lowerContent.includes('correct') || lowerContent.includes('right') ||
            lowerContent.includes('well done') || lowerContent.includes('exactly')) {
            setTimeout(() => TeacherBehavior.playGesture('thumbup', 2), 500);
        }
    }

    // Question asking - pointing gesture
    if (lowerContent.includes('?') || lowerContent.includes('what do you think') ||
        lowerContent.includes('can you') || lowerContent.includes('try to')) {
        setTimeout(() => TeacherBehavior.playGesture('index', 2), 500);
    }

    // Explanation - occasional side gesture or ok
    if (lowerContent.includes('let me explain') || lowerContent.includes('this means') ||
        lowerContent.includes('for example') || lowerContent.includes('in other words')) {
        setTimeout(() => TeacherBehavior.playGesture('ok', 1.5), 500);
    }

    // Uncertainty/Shrug
    if (lowerContent.includes('not sure') || lowerContent.includes('depends') ||
        lowerContent.includes('it varies') || lowerContent.includes('sometimes')) {
        setTimeout(() => TeacherBehavior.playGesture('shrug', 2), 500);
    }

    // Add teaching behavior periodically
    if (Math.random() > 0.7) {
        setTimeout(() => TeacherBehavior.teachingSequence(), 1000);
    }
}

// ===========================================
// Handle Quick Actions
// ===========================================
function handleQuickAction(action) {
    const prompts = {
        explain: "Can you explain a concept to me? I'd like to learn about ",
        quiz: "Quiz me on ",
        example: "Can you give me an example of ",
        curriculum: "Teach me from my textbook about ",
        research: "Research comprehensively about "
    };

    const text = prompts[action] || "";
    elements.userInput.value = text;
    elements.userInput.focus();
    elements.userInput.setSelectionRange(text.length, text.length);
}

// ===========================================
// Voice Input
// ===========================================
let recognition = null;
let isRecording = false;
let selectedLanguage = "en-US"; // Default to English

function toggleVoiceInput() {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
        alert("Voice input is not supported in your browser. Please use Chrome.");
        return;
    }

    if (isRecording) {
        stopVoiceInput();
    } else {
        startVoiceInput();
    }
}

function startVoiceInput() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();

    // Detect mobile - don't use continuous mode on mobile (causes duplicates)
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    recognition.continuous = !isMobile;  // Continuous on desktop, single on mobile
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    // Use selected language
    recognition.lang = selectedLanguage;

    const langName = selectedLanguage === "en-US" ? "English" : "Bengali";
    console.log(`🎙️ Voice input started in ${langName} (mobile: ${isMobile})...`);

    recognition.onstart = () => {
        isRecording = true;
        elements.micBtn.classList.add("recording");
        elements.micBtn.innerHTML = '<span>🔴</span>';
        console.log("🎙️ Listening...");
    };

    let finalTranscript = "";
    let silenceTimer = null;
    let isSendingVoice = false; // Prevent double sending on mobile
    let lastProcessedIndex = -1; // Track processed results to avoid duplicates

    recognition.onresult = (event) => {
        // Ignore input while teacher is speaking or already sending
        if (isSpeaking || isSendingVoice) {
            return;
        }

        let interimTranscript = "";

        // Only process NEW results (skip already processed ones)
        for (let i = event.resultIndex; i < event.results.length; i++) {
            // Skip if we've already processed this result index
            if (i <= lastProcessedIndex && event.results[i].isFinal) {
                continue;
            }

            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
                finalTranscript += transcript + " ";
                lastProcessedIndex = i; // Mark as processed
            } else {
                interimTranscript = transcript;
            }
        }

        const currentText = (finalTranscript + interimTranscript).trim();

        // Show current transcript in input
        elements.userInput.value = currentText;

        // Auto-send after 1.5 seconds of silence (faster on mobile)
        clearTimeout(silenceTimer);
        if (finalTranscript.trim().length > 0) {
            const delay = isMobile ? 1500 : 2000; // Faster on mobile
            silenceTimer = setTimeout(async () => {
                if (finalTranscript.trim().length > 0 && !isSpeaking && !isSendingVoice) {
                    isSendingVoice = true; // Lock to prevent double send
                    const textToSend = finalTranscript.trim();
                    finalTranscript = ""; // Clear immediately
                    lastProcessedIndex = -1; // Reset for next session
                    console.log("✅ Auto-sending:", textToSend);
                    elements.userInput.value = textToSend;
                    await handleSendMessage();
                    isSendingVoice = false; // Unlock after send
                }
            }, delay);
        }
    };

    recognition.onend = () => {
        // Don't auto-restart if teacher is speaking (we paused it intentionally)
        if (isSpeaking) {
            console.log("⏸️ Mic paused - teacher speaking");
            return;
        }

        // If still in recording mode, restart (for continuous listening)
        if (isRecording) {
            console.log("🔄 Restarting voice recognition...");
            try {
                recognition.start();
            } catch (e) {
                console.warn("Recognition restart failed:", e);
                stopVoiceInput();
            }
        }
    };

    recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);

        // Don't stop on "no-speech" error, just continue
        if (event.error === "no-speech") {
            console.log("No speech detected, continuing...");
            return;
        }

        // For other errors, stop
        addMessageToChat(`❌ Voice error: ${event.error}`, "system");
        stopVoiceInput();
    };

    recognition.start();
}

function stopVoiceInput() {
    if (recognition) {
        recognition.stop();
        recognition = null;
    }
    isRecording = false;
    elements.micBtn.classList.remove("recording");
    elements.micBtn.innerHTML = '<span>🎙️</span>';
    addMessageToChat("🛑 Voice input stopped.", "system");
}

// ===========================================
// Live Mode Functions (Gemini Live API)
// ===========================================

function toggleLiveSession() {
    if (isLiveSessionActive) {
        stopLiveSession();
    } else {
        startLiveSession();
    }
}

async function startLiveSession() {
    if (isLiveSessionActive) return;

    // Check if user has credits
    const canProceed = await canPerformAction('aiConversation');
    if (!canProceed.allowed) {
        showUpgradePrompt(canProceed.reason);
        return;
    }

    // Stop regular voice input if running
    if (isRecording) {
        stopVoiceInput();
    }

    // Stop any TTS\n    if (isSpeaking) {\n        isSpeaking = false;\n        if (currentAudio) {\n            currentAudio.pause();\n            currentAudio = null;\n        }\n    }

    try {
        // API key will be fetched from serverless endpoint if not provided locally
        const localApiKey = localStorage.getItem('geminiApiKey');
        const useServerKey = !localApiKey || localApiKey === 'YOUR_GEMINI_API_KEY_HERE';

        if (useServerKey) {
            console.log('🔑 Will fetch API key from server for Live mode');
        }

        // Auto-match Live voice to current teacher (Sir=Charon, Ma'am=Aoede)
        const liveVoice = CONFIG.currentTeacher === 'male' ? 'Charon' : 'Aoede';
        console.log(`🎤 Live voice: ${liveVoice} (Teacher: ${CONFIG.currentTeacher})`);

        // Build system instruction based on student profile
        let systemInstruction = `You are INTELLA, a friendly and encouraging AI teacher.

IMPORTANT - YOU HAVE FUNCTION CALLING TOOLS:
- When student asks for quiz/practice/test → ALWAYS call generate_quiz function. Don't say you can't.
- When student asks to draw/show/visualize/image/diagram → ALWAYS call generate_image function. Don't say you can't generate images.
- When student asks for flashcards → ALWAYS call generate_flashcards function.
- When student asks about progress → ALWAYS call show_student_progress function.
- When student asks to research/investigate/deep dive into a topic → ALWAYS call deep_research function.

NEVER say "I cannot generate images" or "I cannot create quizzes" or "I cannot research" - you CAN by calling the functions above.

When generate_image is called successfully:
- You will receive a description of the generated image in the tool response
- Explain the image content to the student based on that description
- Make the explanation educational and detailed (5-8 sentences)
- Help the student understand the key concepts shown in the image
- Do NOT rush - take your time to explain thoroughly

CRITICAL LANGUAGE RULE:
- ALWAYS respond in ENGLISH ONLY. No exceptions.
- Even if the student speaks another language, respond in English.
- NEVER respond in Hindi, Bengali, or any other language.
- NEVER write English words in Bengali or Devanagari script.
- All text output must be in English with Latin script.

Teaching style:
- Speak warmly like a caring teacher
- Explain concepts simply with examples
- Keep responses concise for normal chat (2-4 sentences)
- For image explanations, be more detailed (5-8 sentences)`;

        if (studentProfile) {
            systemInstruction += `

Student Profile:
- Country: ${studentProfile.countryName || 'Unknown'}
- Education Level: ${studentProfile.levelName || 'Unknown'}
- Class: ${studentProfile.className || 'Unknown'}
- Subjects: ${studentProfile.subjects?.join(', ') || 'General'}

Adapt your teaching style and examples to match this student's level and cultural context.`;
        }

        // Create Live Chat Controller (pass null if using server key)
        liveChatController = new LiveChatController(useServerKey ? null : localApiKey, {
            voiceName: liveVoice,
            systemInstruction: systemInstruction,

            // Define tools for function calling during live conversation
            tools: [{
                functionDeclarations: [
                    {
                        name: "generate_quiz",
                        description: "Generate an interactive quiz with multiple choice questions. Call this WHENEVER a student asks for a quiz, practice questions, or to test their knowledge.",
                        parameters: {
                            type: "OBJECT",
                            properties: {
                                topic: {
                                    type: "STRING",
                                    description: "The topic or subject to quiz on (e.g., 'photosynthesis', 'quadratic equations')"
                                },
                                num_questions: {
                                    type: "INTEGER",
                                    description: "Number of questions to generate (1-10, default is 5)"
                                },
                                difficulty: {
                                    type: "STRING",
                                    description: "Difficulty level: easy, medium, or hard"
                                }
                            },
                            required: ["topic"]
                        }
                    },
                    {
                        name: "show_student_progress",
                        description: "Show the student's learning progress and quiz scores. Call this when student asks about their progress.",
                        parameters: {
                            type: "OBJECT",
                            properties: {
                                subject: {
                                    type: "STRING",
                                    description: "Optional specific subject to show progress for"
                                }
                            }
                        }
                    },
                    {
                        name: "generate_flashcards",
                        description: "Create study flashcards. Call this when student asks for flashcards.",
                        parameters: {
                            type: "OBJECT",
                            properties: {
                                topic: {
                                    type: "STRING",
                                    description: "The topic to create flashcards for"
                                },
                                count: {
                                    type: "INTEGER",
                                    description: "Number of flashcards to generate (3-10, default is 5)"
                                }
                            },
                            required: ["topic"]
                        }
                    },
                    {
                        name: "generate_image",
                        description: "Generate an educational diagram or illustration. Call this WHENEVER a student asks you to draw, show, visualize, create a picture, or explain something visually.",
                        parameters: {
                            type: "OBJECT",
                            properties: {
                                prompt: {
                                    type: "STRING",
                                    description: "What to draw (e.g., 'diagram of photosynthesis', 'Newton's laws of motion')"
                                },
                                style: {
                                    type: "STRING",
                                    description: "Style: diagram, illustration, chart, or infographic"
                                }
                            },
                            required: ["prompt"]
                        }
                    },
                    {
                        name: "deep_research",
                        description: "Conduct deep research on any topic using Google Search. Call this when student asks to research, investigate, or do a deep dive on a subject. Returns a comprehensive research report.",
                        parameters: {
                            type: "OBJECT",
                            properties: {
                                topic: {
                                    type: "STRING",
                                    description: "The topic to research (e.g., 'quantum computing', 'climate change effects')"
                                }
                            },
                            required: ["topic"]
                        }
                    }
                ]
            }],

            // Handle tool calls from the AI
            onToolCall: async (toolCall) => {
                console.log('🔧 Tool call received:', toolCall);

                const responses = [];

                for (const call of toolCall.functionCalls || []) {
                    const { name, args, id } = call;
                    console.log(`🔧 Executing tool: ${name}`, args);

                    let result = {};

                    try {
                        switch (name) {
                            case 'generate_quiz':
                                // Generate quiz and show overlay
                                const topic = args.topic || 'general knowledge';
                                const numQ = Math.min(10, Math.max(1, args.num_questions || 5));
                                const diff = args.difficulty || 'medium';

                                addMessageToChat(`📝 Creating ${numQ} quiz questions on **${topic}**...`, "system");

                                try {
                                    await quizEngine.generateQuiz(
                                        async (prompt) => {
                                            const body = {
                                                contents: [{ role: "user", parts: [{ text: prompt }] }],
                                                generationConfig: buildGenerationConfig('chat')
                                            };
                                            const response = await callGeminiAPI(getModelForTask('chat'), body, false);
                                            const data = await response.json();
                                            return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
                                        },
                                        topic,
                                        topic,
                                        numQ,
                                        diff
                                    );

                                    // Setup quiz overlay
                                    quizOverlayState = {
                                        subject: topic,
                                        topic: topic,
                                        currentIndex: 0,
                                        score: 0,
                                        answers: new Array(quizEngine.currentQuiz.questions.length).fill(null),
                                        questions: quizEngine.currentQuiz.questions,
                                        startTime: new Date()
                                    };

                                    showQuizOverlay();

                                    result = {
                                        success: true,
                                        message: `Quiz created with ${numQ} questions on ${topic}. The quiz is now displayed on screen for the student to answer.`,
                                        questions_count: numQ,
                                        topic: topic
                                    };
                                } catch (quizError) {
                                    console.error('Quiz generation error:', quizError);
                                    result = { success: false, error: 'Failed to generate quiz. Please try again.' };
                                }
                                break;

                            case 'show_student_progress':
                                // Get student progress
                                const profile = loadStudentProfile();
                                const stats = progressTracker.getStatistics();

                                result = {
                                    success: true,
                                    student_name: profile?.studentName || 'Student',
                                    level: profile?.levelName || 'Not set',
                                    subjects: profile?.subjects || [],
                                    topics_mastered: stats?.topicsMastered || 0,
                                    total_quizzes: stats?.quizzesCompleted || 0,
                                    average_score: stats?.averageScore || 0,
                                    learning_streak: stats?.currentStreak || 0
                                };

                                addMessageToChat(`📊 **Your Progress:**\n- Topics Mastered: ${result.topics_mastered}\n- Quizzes Completed: ${result.total_quizzes}\n- Average Score: ${result.average_score}%`, "teacher");
                                break;

                            case 'generate_flashcards':
                                const flashTopic = args.topic || 'general';
                                const flashCount = Math.min(10, Math.max(3, args.count || 5));

                                addMessageToChat(`🃏 Creating ${flashCount} flashcards on **${flashTopic}**...`, "system");

                                // Generate flashcards via AI
                                try {
                                    const flashPrompt = `Generate ${flashCount} flashcards about "${flashTopic}".
Return ONLY valid JSON array:
[{"front": "Question/Term", "back": "Answer/Definition"}]`;

                                    const flashBody = {
                                        contents: [{ role: "user", parts: [{ text: flashPrompt }] }],
                                        generationConfig: buildGenerationConfig('chat')
                                    };
                                    const flashResponse = await callGeminiAPI(getModelForTask('chat'), flashBody, false);
                                    const flashData = await flashResponse.json();
                                    const flashText = flashData.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
                                    const flashMatch = flashText.match(/\[[\s\S]*\]/);
                                    const flashcards = flashMatch ? JSON.parse(flashMatch[0]) : [];

                                    // Display flashcards in chat
                                    let flashHtml = `🃏 **Flashcards: ${flashTopic}**\n\n`;
                                    flashcards.forEach((card, i) => {
                                        flashHtml += `**${i + 1}. ${card.front}**\n→ ${card.back}\n\n`;
                                    });
                                    addMessageToChat(flashHtml, "teacher");

                                    result = {
                                        success: true,
                                        message: `Created ${flashcards.length} flashcards on ${flashTopic}`,
                                        flashcards: flashcards
                                    };
                                } catch (flashError) {
                                    console.error('Flashcard generation error:', flashError);
                                    result = { success: false, error: 'Failed to generate flashcards' };
                                }
                                break;

                            case 'deep_research':
                                const researchTopic = args.topic || 'general topic';
                                addMessageToChat(`🔍 Starting deep research on **${researchTopic}**...`, "system");

                                if (head) {
                                    head.setMood('fear');
                                }

                                try {
                                    const researchResult = await performDeepResearch(researchTopic);

                                    // Show research in chat
                                    addMessageToChat(`📊 **Research Complete: ${researchTopic}**\n\n${researchResult}`, "teacher");

                                    if (head) {
                                        head.setMood('happy');
                                        setTimeout(() => head.setMood('neutral'), 5000);
                                    }

                                    // Track progress
                                    progressTracker.updateMastery('Research', researchTopic, true);

                                    // Summarize for voice (full report is too long to speak)
                                    const summary = researchResult.substring(0, 500);
                                    result = {
                                        success: true,
                                        message: `Research on "${researchTopic}" is complete. The full report is displayed in chat. Here is a brief summary to speak to the student: ${summary}... Tell the student the full report is available in the chat and highlight the 2-3 most interesting findings.`
                                    };
                                } catch (researchError) {
                                    console.error('Research error:', researchError);
                                    if (head) head.setMood('neutral');
                                    result = { success: false, error: 'Research failed: ' + researchError.message };
                                }
                                break;

                            case 'generate_image':
                                const imagePromptText = args.prompt || 'educational diagram';
                                const imageStyle = args.style || 'diagram';

                                addMessageToChat(`🎨 Creating ${imageStyle} of **${imagePromptText}**...`, "system");

                                try {
                                    // Use existing generateEducationalImage function
                                    const imageResult = await generateEducationalImage(
                                        `${imageStyle} of ${imagePromptText}. Make it educational, clear, and easy for students to understand.`
                                    );

                                    if (imageResult.success && imageResult.imageData) {
                                        // Display image (same as Google TTS mode) - bypasses marked/dompurify
                                        displayGeneratedImage(imageResult.imageData, imageResult.mimeType);
                                        showMagicImageOverlay(imageResult.imageData, imageResult.mimeType);

                                        // Use Gemini Vision to analyze the ACTUAL image content
                                        // (same as Google TTS mode - gives accurate description)
                                        console.log("🔍 [Live] Getting vision-based explanation of generated image...");
                                        const imageExplanation = await explainGeneratedImage(
                                            imageResult.imageData,
                                            imageResult.mimeType,
                                            imagePromptText
                                        );

                                        if (imageExplanation) {
                                            // Show explanation in chat
                                            addMessageToChat(imageExplanation, "teacher");

                                            // Include real description in tool response so Live API
                                            // speaks an accurate explanation (not hallucinated)
                                            result = {
                                                success: true,
                                                image_description: imageExplanation,
                                                message: `Image generated and displayed. Here is the accurate description of what the image shows: "${imageExplanation}". Now explain this to the student in your own words based on this description. Speak naturally.`
                                            };
                                        } else {
                                            // Vision failed - fallback: tell AI to describe based on prompt
                                            result = {
                                                success: true,
                                                message: `Image of "${imagePromptText}" created and displayed. Vision analysis unavailable. Please describe the ${imageStyle} based on the topic to help the student understand.`
                                            };
                                        }

                                        // Flag: hide overlay when AI finishes speaking (onStreamEnd)
                                        window._liveImageOverlayActive = true;
                                    } else {
                                        result = {
                                            success: false,
                                            error: imageResult.text || 'Could not generate image'
                                        };
                                    }
                                } catch (imageError) {
                                    console.error('Image generation error:', imageError);
                                    result = { success: false, error: 'Failed to generate image: ' + imageError.message };
                                }
                                break;

                            default:
                                result = { success: false, error: `Unknown tool: ${name}` };
                        }
                    } catch (toolError) {
                        console.error(`Tool ${name} error:`, toolError);
                        result = { success: false, error: toolError.message };
                    }

                    responses.push({
                        id: id,
                        name: name,
                        response: { output: result }
                    });
                }

                // Send tool responses back to the AI
                if (liveChatController && responses.length > 0) {
                    liveChatController.sendToolResponse(responses);
                    console.log('📤 Tool responses sent:', responses);
                }
            },

            // Lip sync: Use TalkingHead's built-in streaming system (same engine as Google TTS)
            onAmplitude: null,  // Not needed - TalkingHead handles lip sync internally

            // Initialize TalkingHead streaming for live conversation
            onStreamStart: async () => {
                console.log('🎤 Live audio stream starting - using TalkingHead streamAudio');
                if (head && head.streamStart) {
                    try {
                        await head.streamStart(
                            { sampleRate: 24000, lipsyncLang: 'en' },
                            () => { console.log('🔊 TalkingHead stream audio started'); },
                            () => { console.log('🔊 TalkingHead stream audio ended'); head.isSpeaking = false; }
                        );
                        head.isSpeaking = true;
                        if (head.speakWithHands) head.speakWithHands();
                        console.log('✅ TalkingHead streaming lip sync started');
                    } catch (e) {
                        console.error('❌ TalkingHead streamStart error:', e);
                    }
                }
            },

            onAudioChunk: (pcmData) => {
                // Feed PCM16 directly into TalkingHead's streaming lip sync engine
                if (head && head.streamAudio) {
                    head.streamAudio({ audio: pcmData });
                }
            },

            onInterrupted: () => {
                console.log('⚡ Live stream interrupted by user');
                if (head) {
                    head.streamInterrupt();
                    console.log('🛑 TalkingHead streamInterrupt called (stops audio + lip sync)');
                }
            },

            onStreamEnd: () => {
                console.log('🛑 Live audio stream ended');
                if (head) {
                    // Tell TalkingHead to finish playing buffered audio naturally
                    if (head.streamNotifyEnd) {
                        head.streamNotifyEnd();
                        console.log('✅ TalkingHead streamNotifyEnd called');
                    }
                }
                // Hide magic image overlay when AI finishes speaking
                if (window._liveImageOverlayActive) {
                    window._liveImageOverlayActive = false;
                    // Small delay so last words sync with image visible
                    setTimeout(() => hideMagicImageOverlay(), 1500);
                    console.log('🖼️ Magic image overlay will hide after stream end');
                }
            },

            onStatusChange: (status) => {
                console.log(`🔴 Live status: ${status}`);

                if (status === 'connected') {
                    isLiveSessionActive = true;
                    updateLiveUI(true);
                    addMessageToChat("🔴 Live conversation started! Speak naturally with your AI teacher.", "system");
                } else if (status === 'disconnected' || status === 'error') {
                    isLiveSessionActive = false;
                    updateLiveUI(false);
                }
            },

            onUserSpeaking: (speaking) => {
                // Visual feedback when user is speaking
                if (speaking && elements.liveMicBtn) {
                    elements.liveMicBtn.classList.add('user-speaking');
                }
            },

            onVolumeChange: (volume) => {
                // Could add volume visualization here
            },

            onAIResponse: (text, isComplete) => {
                // Show AI response in chat
                if (isComplete && text) {
                    addMessageToChat(text, "teacher");

                    // Update conversation history
                    conversationHistory.push({ role: "assistant", content: text });

                    // Deduct credits for the response
                    const user = getCurrentUser();
                    if (!canProceed.unlimited) {
                        deductCredits(user?.uid || null, 'aiConversation');
                        updateCreditsDisplay();
                    }

                    // Animate avatar
                    if (head && head.setMood) {
                        head.setMood('happy');
                    }
                }
            },

            onTranscript: (transcript) => {
                // Show what AI said (complete transcript)
                console.log('🤖 AI transcript:', transcript);
            },

            onUserTranscript: (text, isComplete) => {
                // Show user speech in chat IMMEDIATELY
                if (text && text.trim()) {
                    console.log('🎤 User transcript:', text, 'complete:', isComplete);

                    if (!isComplete) {
                        // Partial transcript - accumulate and show immediately
                        const prevPartial = window.liveUserPartialTranscript || '';
                        window.liveUserPartialTranscript = prevPartial + text;

                        // Update or create the temporary user message immediately
                        let existingPartial = document.getElementById('live-user-partial');
                        if (existingPartial) {
                            const contentEl = existingPartial.querySelector('.message-content');
                            if (contentEl) contentEl.textContent = window.liveUserPartialTranscript;
                        } else {
                            // Create new partial message immediately - use correct ID
                            const chatContainer = document.getElementById('chat-messages');
                            if (chatContainer) {
                                const partialDiv = document.createElement('div');
                                partialDiv.id = 'live-user-partial';
                                partialDiv.className = 'chat-message user-message';
                                partialDiv.innerHTML = `<div class="message-content">${window.liveUserPartialTranscript}</div>`;
                                chatContainer.appendChild(partialDiv);
                                chatContainer.scrollTop = chatContainer.scrollHeight;
                                console.log('✅ Created live user partial message');
                            } else {
                                console.error('❌ chat-messages container not found');
                            }
                        }
                    } else {
                        // Complete transcript - finalize the message
                        const fullText = window.liveUserPartialTranscript || text;
                        window.liveUserPartialTranscript = ''; // Reset

                        // Remove partial message if exists
                        const existingPartial = document.getElementById('live-user-partial');
                        if (existingPartial) {
                            existingPartial.remove();
                        }

                        console.log('🎤 User said (final):', fullText);
                        addMessageToChat(fullText, "user");
                        conversationHistory.push({ role: "user", content: fullText });
                    }
                }
            },

            onAITranscript: (text, isComplete) => {
                // Real-time AI transcript logging
                if (!isComplete) {
                    // Could show partial transcript here
                }
            },

            onError: (error) => {
                console.error('Live API error:', error);
                addMessageToChat(`❌ Live mode error: ${error.message || 'Connection failed'}`, "system");
                stopLiveSession();
            }
        });

        // Start the Live session
        await liveChatController.start();

        // CRITICAL: Resume audio context (browser autoplay policy requires user interaction)
        liveChatController.resumeAudio();
        console.log('🔊 Audio context resumed for Live session');

    } catch (error) {
        console.error('Failed to start Live session:', error);
        addMessageToChat(`❌ Failed to start Live mode: ${error.message}`, "system");
        isLiveSessionActive = false;
        updateLiveUI(false);
    }
}

function stopLiveSession() {
    if (liveChatController) {
        liveChatController.stop();
        liveChatController = null;
    }

    // Stop TalkingHead streaming if active
    if (head && head.streamStop) {
        head.streamStop();
    }

    isLiveSessionActive = false;
    updateLiveUI(false);

    addMessageToChat("🛑 Live conversation ended.", "system");
}

function updateLiveUI(active) {
    // Update liveMicBtn (original Live button)
    if (elements.liveMicBtn) {
        if (active) {
            elements.liveMicBtn.classList.add('live-active');
            elements.liveMicBtn.innerHTML = '<span class="live-dot"></span><svg class="live-mic-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/></svg><span class="live-label">STOP</span>';
            elements.liveMicBtn.title = 'Stop Live conversation';
        } else {
            elements.liveMicBtn.classList.remove('live-active', 'user-speaking');
            elements.liveMicBtn.innerHTML = '<span class="live-dot"></span><svg class="live-mic-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg><span class="live-label">LIVE</span>';
            elements.liveMicBtn.title = 'Start Live conversation';
        }
    }

    // Update live-talk-btn (alternative Live button)
    const liveTalkBtn = document.getElementById('live-talk-btn');
    if (liveTalkBtn) {
        if (active) {
            liveTalkBtn.classList.add('active', 'pulse');
            liveTalkBtn.innerHTML = '<span>🔴</span>';
            liveTalkBtn.title = 'End Live Conversation';
        } else {
            liveTalkBtn.classList.remove('active', 'pulse');
            liveTalkBtn.innerHTML = '<span>🎤</span>';
            liveTalkBtn.title = 'Live Voice Conversation';
        }
    }

    // Hide regular mic button during Live mode
    if (elements.micBtn) {
        elements.micBtn.style.display = active ? 'none' : '';
        elements.micBtn.disabled = active;
    }

    // Disable text inputs during live mode
    const sendBtn = document.getElementById('send-btn');
    const userInput = document.getElementById('user-input');
    if (sendBtn) sendBtn.disabled = active;
    if (userInput) {
        userInput.disabled = active;
        userInput.placeholder = active ? "Speaking live with teacher..." : "Ask your teacher anything...";
    }
}

// Send text message during Live session
function sendLiveText(text) {
    if (liveChatController && isLiveSessionActive) {
        liveChatController.sendText(text);
        addMessageToChat(text, "user");
        conversationHistory.push({ role: "user", content: text });
    }
}

// Send image during Live session
function sendLiveImage(base64Image, mimeType, text = '') {
    if (liveChatController && isLiveSessionActive) {
        liveChatController.sendImage(base64Image, mimeType, text);
        if (text) {
            addMessageToChat(text, "user");
        }
    }
}

// ===========================================
// Theme Toggle
// ===========================================
function toggleTheme() {
    document.body.classList.toggle("dark-theme");
    const isDark = document.body.classList.contains("dark-theme");
    if (elements.themeToggle) {
        elements.themeToggle.textContent = isDark ? "☀️" : "🌙";
    }
    localStorage.setItem("theme", isDark ? "dark" : "light");
}

// ===========================================
// Chat Panel Toggle (Liquid Glass UI)
// ===========================================
function toggleChatPanel() {
    const panel = elements.chatPanel;
    if (panel) {
        panel.classList.toggle("hidden");
        // Update button icon
        const btn = elements.toggleChatBtn;
        if (btn) {
            const icon = btn.querySelector('.btn-icon');
            if (icon) {
                icon.textContent = panel.classList.contains("hidden") ? "💬" : "✕";
            }
        }
    }
}

// ===========================================
// Update Progress Widget
// ===========================================
function updateProgressWidget() {
    const widget = elements.progressWidget;
    if (!widget) return;

    const stats = progressTracker.getStats();
    const progressFill = widget.querySelector('.progress-fill');
    const progressStats = widget.querySelector('#progress-stats');

    if (progressFill && stats.totalTopics > 0) {
        const percentage = Math.round((stats.masteredTopics / stats.totalTopics) * 100);
        progressFill.style.width = `${percentage}%`;
    }

    if (progressStats) {
        progressStats.innerHTML = `<span>${stats.masteredTopics || 0} topics learned</span>`;
    }
}

// ===========================================
// Settings Management
// ===========================================
function loadSettings() {
    // Load theme
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
        document.body.classList.add("dark-theme");
        if (elements.themeToggle) {
            elements.themeToggle.textContent = "☀️";
        }
    }

    // Load API keys from localStorage (if saved)
    const savedGeminiKey = localStorage.getItem("geminiApiKey");

    if (savedGeminiKey) {
        CONFIG.geminiApiKey = savedGeminiKey;
        if (elements.geminiApiKey) elements.geminiApiKey.value = savedGeminiKey;
    }

    // Load other settings
    const savedVoice = localStorage.getItem("ttsVoice");
    if (savedVoice) {
        CONFIG.ttsVoice = savedVoice;
        if (elements.voiceSelect) elements.voiceSelect.value = savedVoice;
    }

    const savedRate = localStorage.getItem("ttsRate");
    if (savedRate) {
        CONFIG.ttsRate = parseFloat(savedRate);
        if (elements.speechRate) elements.speechRate.value = savedRate;
        if (elements.rateValue) elements.rateValue.textContent = `${parseFloat(savedRate).toFixed(1)}x`;
    }

    const savedStyle = localStorage.getItem("teacherStyle");
    if (savedStyle) {
        CONFIG.teacherStyle = savedStyle;
        if (elements.teacherStyle) elements.teacherStyle.value = savedStyle;
    }

    const savedSubject = localStorage.getItem("subjectFocus");
    if (savedSubject) {
        CONFIG.subjectFocus = savedSubject;
        if (elements.subjectFocus) elements.subjectFocus.value = savedSubject;
    }

    // Load teacher preference
    const savedTeacher = localStorage.getItem("intella_teacher_preference");
    if (savedTeacher && CONFIG.teacherAvatars[savedTeacher]) {
        CONFIG.currentTeacher = savedTeacher;
        CONFIG.avatarUrl = CONFIG.teacherAvatars[savedTeacher].url;
        // Update teacher selector UI
        const teacherOptions = document.querySelectorAll('.teacher-option');
        teacherOptions.forEach(opt => {
            if (opt.dataset.teacher === savedTeacher) {
                opt.classList.add('selected');
            } else {
                opt.classList.remove('selected');
            }
        });
    }
}

function saveSettings() {
    // Get values from form
    const geminiKey = elements.geminiApiKey?.value.trim();
    const speechInputLang = document.getElementById('speech-input-lang')?.value;  // Web Speech input language
    const voiceLanguage = document.getElementById('voice-language')?.value;       // Edge TTS voice name
    const voiceEmotion = document.getElementById('voice-emotion')?.value;
    const rate = elements.speechRate?.value;
    const style = elements.teacherStyle?.value;
    const subject = elements.subjectFocus?.value;

    // Update config with voice settings
    if (geminiKey) CONFIG.geminiApiKey = geminiKey;

    // Speech Input Language (for Web Speech API - microphone)
    if (speechInputLang) {
        selectedLanguage = speechInputLang;
        CONFIG.speechInputLang = speechInputLang;

        // Update language indicator in UI
        const langIndicator = document.getElementById('current-lang');
        if (langIndicator) {
            const shortCode = speechInputLang.split('-')[0];
            langIndicator.textContent = shortCode.toUpperCase();
        }
    }

    // TTS Voice (Edge TTS output - direct voice name like "bn-BD-NabanitaNeural")
    if (voiceLanguage) {
        CONFIG.tts.edgeVoice = voiceLanguage;  // Now it's the direct voice name
        CONFIG.voiceLanguage = voiceLanguage;
    }

    if (voiceEmotion) {
        CONFIG.tts.edgeEmotion = voiceEmotion;
    }
    if (rate) CONFIG.tts.speakingRate = parseFloat(rate);
    if (style) CONFIG.teacherStyle = style;
    if (subject) CONFIG.subjectFocus = subject;

    // Save to localStorage
    if (geminiKey) localStorage.setItem("geminiApiKey", geminiKey);
    if (speechInputLang) localStorage.setItem("speechInputLang", speechInputLang);
    if (voiceLanguage) localStorage.setItem("voiceLanguage", voiceLanguage);
    if (voiceEmotion) localStorage.setItem("voiceEmotion", voiceEmotion);
    if (rate) localStorage.setItem("ttsRate", rate);
    if (style) localStorage.setItem("teacherStyle", style);
    if (subject) localStorage.setItem("subjectFocus", subject);

    // Close modal
    elements.settingsModal?.classList.add("hidden");

    // Show confirmation
    addMessageToChat(`⚙️ Settings saved! Voice: ${voiceLanguage} | Input: ${speechInputLang}`, "system");
    console.log("✅ Settings:", "Voice:", voiceLanguage, "| Input Lang:", speechInputLang, "| Emotion:", CONFIG.tts.edgeEmotion);
}

// Load saved voice settings on startup
function loadVoiceSettings() {
    const savedSpeechInput = localStorage.getItem("speechInputLang");  // Web Speech input language
    const savedVoice = localStorage.getItem("voiceLanguage");          // Edge TTS voice name
    const savedEmotion = localStorage.getItem("voiceEmotion");
    const savedRate = localStorage.getItem("ttsRate");

    // Load Speech Input Language (for microphone/Web Speech API)
    if (savedSpeechInput) {
        const speechSelect = document.getElementById('speech-input-lang');
        if (speechSelect) speechSelect.value = savedSpeechInput;
        selectedLanguage = savedSpeechInput;
        CONFIG.speechInputLang = savedSpeechInput;

        // Update language indicator
        const langIndicator = document.getElementById('current-lang');
        if (langIndicator) {
            const shortCode = savedSpeechInput.split('-')[0];
            langIndicator.textContent = shortCode.toUpperCase();
        }
    }

    // Load TTS Voice (direct voice name like "bn-BD-NabanitaNeural")
    if (savedVoice) {
        const voiceSelect = document.getElementById('voice-language');
        if (voiceSelect) voiceSelect.value = savedVoice;
        CONFIG.tts.edgeVoice = savedVoice;
        CONFIG.voiceLanguage = savedVoice;
    }

    if (savedEmotion) {
        const emotionSelect = document.getElementById('voice-emotion');
        if (emotionSelect) emotionSelect.value = savedEmotion;
        CONFIG.tts.edgeEmotion = savedEmotion;
    }
    if (savedRate) {
        const rateInput = document.getElementById('speech-rate');
        if (rateInput) rateInput.value = savedRate;
        CONFIG.tts.speakingRate = parseFloat(savedRate);
    }

    // Add speech-input-lang change listener (real-time update)
    const speechSelect = document.getElementById('speech-input-lang');
    if (speechSelect) {
        speechSelect.addEventListener('change', (e) => {
            selectedLanguage = e.target.value;

            // Update language indicator
            const langIndicator = document.getElementById('current-lang');
            if (langIndicator) {
                const shortCode = e.target.value.split('-')[0];
                langIndicator.textContent = shortCode.toUpperCase();
            }

            console.log("🎤 Speech input changed to:", selectedLanguage);
        });
    }

    // Load Live Mode settings
    const savedLiveMode = localStorage.getItem('liveModeEnabled');
    if (savedLiveMode === 'true') {
        isLiveModeEnabled = true;
        if (elements.liveModeToggle) {
            elements.liveModeToggle.checked = true;
        }
        if (elements.liveModeOptions) {
            elements.liveModeOptions.classList.remove('hidden');
        }
        if (elements.liveMicBtn) {
            elements.liveMicBtn.classList.remove('hidden');
        }
    }

    console.log("✅ Voice settings loaded | TTS:", CONFIG.tts.edgeVoice || 'default', "| Speech Input:", selectedLanguage, "| Live Mode:", isLiveModeEnabled);
}

// ===========================================
// Utility Functions
// ===========================================
function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

// ===========================================
// Start Application
// ===========================================

// LightRays effect DISABLED - using classroom GLB background instead
// let lightRays = null;
// function initializeLightRays() { ... }

// Create animated particle stars on load
function createParticleStars() {
    const particleField = document.getElementById('particle-field');
    if (!particleField) return;

    const particleCount = 100;

    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';

        // Random position
        particle.style.left = Math.random() * 100 + '%';
        particle.style.top = Math.random() * 100 + '%';

        // Random animation delay
        particle.style.animationDelay = Math.random() * 3 + 's';

        // Random size variation (1-3px)
        const size = Math.random() * 2 + 1;
        particle.style.width = size + 'px';
        particle.style.height = size + 'px';

        particleField.appendChild(particle);
    }

    console.log('✨ Particle stars created');
}

// ===========================================
// 🎤 ADVANCED LIVE VOICE CONVERSATION SYSTEM
// Features: VAD, Echo Prevention, State Machine, Multi-language
// ===========================================

// Conversation State Machine
const LiveState = {
    IDLE: 'idle',           // Not active
    LISTENING: 'listening', // Listening for user speech
    THINKING: 'thinking',   // Processing user input
    SPEAKING: 'speaking'    // AI is speaking
};

// Live conversation state
let liveConversationState = {
    state: LiveState.IDLE,
    recognition: null,          // Web Speech API instance
    audioStream: null,          // Microphone stream
    audioContext: null,         // Audio context for VAD
    analyser: null,             // Audio analyser for VAD
    isMicMuted: false,          // Mic mute state
    currentTranscript: '',      // Current speech transcript
    interimTranscript: '',      // Interim (partial) transcript
    silenceTimer: null,         // Timer for silence detection
    lastSpeechTime: 0,          // Last time user spoke
    vadThreshold: 0.02,         // Voice Activity Detection threshold
    silenceTimeout: 1500,       // ms of silence before processing
    isProcessing: false,        // Prevent double processing
    language: 'bn-BD'           // Default language (Bengali)
};

// Aliases for backward compatibility
let isLiveMode = false;
let liveSession = null;
let mediaRecorder = null;
let audioStream = null;
let audioContext = null;
let audioWorklet = null;
let audioChunksBuffer = [];
let isPlayingAudio = false;
let audioQueue = [];

// ===========================================
// 🎯 START LIVE CONVERSATION
// ===========================================
async function startLiveConversation() {
    console.log("🎤 Starting Advanced Live Voice Conversation...");

    // Check browser support
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        addMessageToChat("❌ Your browser doesn't support voice recognition. Please use Chrome.", "system");
        return;
    }

    try {
        // Request microphone access with echo cancellation
        liveConversationState.audioStream = await navigator.mediaDevices.getUserMedia({
            audio: {
                sampleRate: 16000,
                channelCount: 1,
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            }
        });

        console.log("✅ Microphone access granted");

        // Setup Audio Context for VAD (Voice Activity Detection)
        setupVAD();

        // Setup Web Speech API (VAD will start it when user speaks)
        setupSpeechRecognition();

        // Update state
        liveConversationState.state = LiveState.LISTENING;
        isLiveMode = true;
        isSTTActive = false;  // VAD will start STT when user speaks

        // Update UI
        updateLiveUI(true);
        addMessageToChat("🎤 Live mode ready! Start speaking anytime...", "system");

        // DON'T auto-start STT - VAD will start it when voice detected
        // startListening(); // REMOVED - VAD controls this now

        // Visual feedback
        if (head) {
            TeacherBehavior.setMood('happy');
            await speakText("I'm listening! Go ahead and ask me anything.");
            TeacherBehavior.startIdleBehavior();
        }

    } catch (error) {
        console.error("❌ Failed to start live conversation:", error);

        if (error.name === 'NotAllowedError') {
            addMessageToChat("❌ Microphone access denied. Please allow microphone access.", "system");
        } else {
            addMessageToChat("❌ Failed to start voice mode. Please try again.", "system");
        }

        stopLiveConversation();
    }
}

// ===========================================
// 🎙️ ADVANCED WEBRTC-STYLE VOICE ACTIVITY DETECTION (VAD)
// Uses frequency analysis + temporal patterns like Google Meet/Zoom
// ===========================================

// VAD Configuration - Optimized for SENSITIVE detection
const VAD_CONFIG = {
    // Base thresholds - LOW for sensitivity
    energyThreshold: 0.008,      // VERY LOW - hear soft speech
    zeroCrossThreshold: 0.05,    // Zero crossing rate threshold
    spectralFluxThreshold: 0.01, // Low - detect any speech onset

    // Voice frequency range
    voiceMinFreq: 80,            // Include low male voices
    voiceMaxFreq: 3000,          // Full speech range

    // Temporal smoothing - GENEROUS timing
    hangoverFrames: 25,          // LONGER: Keep listening after silence (wait for more speech)
    minSpeechFrames: 1,          // INSTANT: Just 1 frame to detect!
    minInterruptFrames: 1,       // INSTANT: 1 frame to interrupt teacher!

    // Timing
    frameSize: 512,              // Audio frame size
    sampleRate: 16000            // Sample rate
};

// VAD State - with TTS baseline tracking
let vadState = {
    isSpeaking: false,
    speechFrameCount: 0,
    silenceFrameCount: 0,
    previousSpectrum: null,
    energyHistory: [],
    maxHistoryLength: 10,

    // TTS Echo Cancellation Simulation
    ttsBaselineEnergy: 0,        // Energy level during TTS (what mic picks up from speakers)
    ttsBaselineSamples: [],      // Samples to compute baseline
    isCapturingBaseline: false,  // Are we measuring TTS output level?
    lastTTSEnergy: 0             // Last known TTS energy for comparison
};

function setupVAD() {
    liveConversationState.audioContext = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: VAD_CONFIG.sampleRate
    });

    const source = liveConversationState.audioContext.createMediaStreamSource(liveConversationState.audioStream);

    // Create analyser for frequency analysis
    liveConversationState.analyser = liveConversationState.audioContext.createAnalyser();
    liveConversationState.analyser.fftSize = VAD_CONFIG.frameSize * 2;
    liveConversationState.analyser.smoothingTimeConstant = 0.5;

    source.connect(liveConversationState.analyser);

    // Start VAD monitoring loop
    startVADMonitoring();

    console.log("✅ Advanced WebRTC-style VAD setup complete");
}

// Main VAD monitoring loop - with TTS echo cancellation
function startVADMonitoring() {
    if (!isLiveMode || !liveConversationState.analyser) return;

    const isTeacherTalking = (liveConversationState.state === LiveState.SPEAKING || isSpeaking);

    // 📊 Capture TTS baseline when teacher starts speaking
    if (isTeacherTalking && !vadState.isCapturingBaseline && vadState.ttsBaselineSamples.length < 5) {
        vadState.isCapturingBaseline = true;
    }

    const isSpeechFrame = analyzeVoiceActivity();

    // INSTANT interruption: just 1 frame when teacher is talking!
    const requiredFrames = isTeacherTalking ? VAD_CONFIG.minInterruptFrames : VAD_CONFIG.minSpeechFrames;

    // Update VAD state with temporal smoothing
    if (isSpeechFrame) {
        vadState.speechFrameCount++;
        vadState.silenceFrameCount = 0;

        // Confirm speech after minimum frames (INSTANT when interrupting)
        if (vadState.speechFrameCount >= requiredFrames && !vadState.isSpeaking) {
            vadState.isSpeaking = true;
            onVADSpeechStart();
        }
    } else {
        vadState.silenceFrameCount++;

        // Use hangover to avoid cutting off speech
        if (vadState.silenceFrameCount >= VAD_CONFIG.hangoverFrames && vadState.isSpeaking) {
            vadState.isSpeaking = false;
            vadState.speechFrameCount = 0;
            onVADSpeechEnd();
        }
    }

    // Continue monitoring at ~30fps
    if (isLiveMode) {
        requestAnimationFrame(startVADMonitoring);
    }
}

// Advanced voice activity analysis using multiple features + Echo Cancellation
function analyzeVoiceActivity() {
    const analyser = liveConversationState.analyser;
    if (!analyser) return false;

    const frequencyData = new Uint8Array(analyser.frequencyBinCount);
    const timeData = new Float32Array(analyser.fftSize);

    analyser.getByteFrequencyData(frequencyData);
    analyser.getFloatTimeDomainData(timeData);

    const isTeacherTalking = (liveConversationState.state === LiveState.SPEAKING || isSpeaking);

    // 1. RMS Energy (volume level)
    const energy = calculateRMSEnergy(timeData);

    // 📊 ECHO CANCELLATION: Track TTS baseline energy
    if (isTeacherTalking && vadState.isCapturingBaseline) {
        vadState.ttsBaselineSamples.push(energy);
        if (vadState.ttsBaselineSamples.length >= 5) {
            // Calculate average TTS energy (what mic picks up from speakers)
            vadState.ttsBaselineEnergy = vadState.ttsBaselineSamples.reduce((a, b) => a + b, 0) / vadState.ttsBaselineSamples.length;
            vadState.isCapturingBaseline = false;
            console.log(`📊 TTS baseline energy: ${vadState.ttsBaselineEnergy.toFixed(4)}`);
        }
    }

    // Reset baseline when teacher stops
    if (!isTeacherTalking && vadState.ttsBaselineSamples.length > 0) {
        vadState.ttsBaselineSamples = [];
        vadState.ttsBaselineEnergy = 0;
    }

    // 2. Voice Band Energy (focus on speech frequencies: 100-2500Hz)
    const voiceBandEnergy = calculateVoiceBandEnergy(frequencyData);

    // 3. Zero Crossing Rate (human speech has medium ZCR)
    const zcr = calculateZeroCrossingRate(timeData);

    // 4. Spectral Flux (sudden changes = speech onset)
    const spectralFlux = calculateSpectralFlux(frequencyData);

    // 5. Spectral Centroid (human voice ~150-400Hz, TTS may differ)
    const centroid = calculateSpectralCentroid(frequencyData);

    // Store energy history for adaptive thresholding
    vadState.energyHistory.push(energy);
    if (vadState.energyHistory.length > vadState.maxHistoryLength) {
        vadState.energyHistory.shift();
    }

    // 🎯 SMART THRESHOLDING during TTS:
    // User voice must be just SLIGHTLY louder than TTS baseline
    let adaptiveThreshold;
    if (isTeacherTalking && vadState.ttsBaselineEnergy > 0) {
        // User just needs to speak 1.1x louder than TTS feedback (NOT 1.5x!)
        adaptiveThreshold = vadState.ttsBaselineEnergy * 1.1;
    } else {
        // Normal mode: VERY sensitive - just above noise floor
        const avgEnergy = vadState.energyHistory.reduce((a, b) => a + b, 0) / vadState.energyHistory.length;
        adaptiveThreshold = Math.max(VAD_CONFIG.energyThreshold, avgEnergy * 0.3);
    }

    // 🎤 SIMPLE detection - just check energy and voice band
    const isVoice = (
        energy > adaptiveThreshold &&
        voiceBandEnergy > VAD_CONFIG.energyThreshold * 0.3 &&
        centroid > VAD_CONFIG.voiceMinFreq &&
        centroid < VAD_CONFIG.voiceMaxFreq
    );

    // During TTS, also accept if energy is significantly higher (user speaking)
    if (isTeacherTalking && energy > adaptiveThreshold * 1.2) {
        return true; // Definitely user speaking over TTS
    }

    return isVoice;
}

// Calculate RMS (Root Mean Square) energy
function calculateRMSEnergy(timeData) {
    let sum = 0;
    for (let i = 0; i < timeData.length; i++) {
        sum += timeData[i] * timeData[i];
    }
    return Math.sqrt(sum / timeData.length);
}

// Calculate energy in voice frequency band (85Hz - 3000Hz)
function calculateVoiceBandEnergy(frequencyData) {
    const sampleRate = VAD_CONFIG.sampleRate;
    const binSize = sampleRate / (frequencyData.length * 2);

    const minBin = Math.floor(VAD_CONFIG.voiceMinFreq / binSize);
    const maxBin = Math.floor(VAD_CONFIG.voiceMaxFreq / binSize);

    let sum = 0;
    let count = 0;
    for (let i = minBin; i < maxBin && i < frequencyData.length; i++) {
        sum += frequencyData[i] * frequencyData[i];
        count++;
    }

    return count > 0 ? Math.sqrt(sum / count) / 255 : 0;
}

// Calculate Zero Crossing Rate
function calculateZeroCrossingRate(timeData) {
    let crossings = 0;
    for (let i = 1; i < timeData.length; i++) {
        if ((timeData[i] >= 0 && timeData[i - 1] < 0) ||
            (timeData[i] < 0 && timeData[i - 1] >= 0)) {
            crossings++;
        }
    }
    return crossings / timeData.length;
}

// Calculate Spectral Flux (change between frames)
function calculateSpectralFlux(frequencyData) {
    if (!vadState.previousSpectrum) {
        vadState.previousSpectrum = new Uint8Array(frequencyData);
        return 0;
    }

    let flux = 0;
    for (let i = 0; i < frequencyData.length; i++) {
        const diff = frequencyData[i] - vadState.previousSpectrum[i];
        flux += diff > 0 ? diff : 0; // Only positive changes (onset)
    }

    vadState.previousSpectrum = new Uint8Array(frequencyData);
    return flux / (frequencyData.length * 255);
}

// Calculate Spectral Centroid (brightness/center of mass)
function calculateSpectralCentroid(frequencyData) {
    const sampleRate = VAD_CONFIG.sampleRate;
    const binSize = sampleRate / (frequencyData.length * 2);

    let weightedSum = 0;
    let totalSum = 0;

    for (let i = 0; i < frequencyData.length; i++) {
        const frequency = i * binSize;
        weightedSum += frequency * frequencyData[i];
        totalSum += frequencyData[i];
    }

    return totalSum > 0 ? weightedSum / totalSum : 0;
}

// Track if STT is currently active
let isSTTActive = false;
let lastVoiceTime = 0;
const SILENCE_BEFORE_PROCESS = 1200; // ms of silence before processing transcript

// Called when VAD detects speech start - INSTANTLY start STT
function onVADSpeechStart() {
    console.log("🎤 VAD: Voice detected!");
    lastVoiceTime = Date.now();

    // If teacher is speaking, interrupt IMMEDIATELY - no delay!
    if (liveConversationState.state === LiveState.SPEAKING || isSpeaking) {
        console.log("⚡ INSTANT INTERRUPT - User speaking over teacher!");

        // 🚨 Stop EVERYTHING immediately
        if (head) {
            head.stopSpeaking();
            head.speakWithHands(""); // Clear any pending
        }
        if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }

        // Stop all audio playback
        shouldAbortPlayback = true;
        speechQueue.length = 0;
        isSpeaking = false;

        // Stop any Edge TTS audio that might be playing
        const audioElements = document.querySelectorAll('audio');
        audioElements.forEach(audio => {
            audio.pause();
            audio.currentTime = 0;
        });

        // Update state IMMEDIATELY
        setLiveState(LiveState.LISTENING);
        liveConversationState.isMicMuted = false;

        // 🔄 RESET VAD STATE - so it hears user instantly after interrupt!
        vadState.ttsBaselineEnergy = 0;
        vadState.ttsBaselineSamples = [];
        vadState.isCapturingBaseline = false;
        vadState.energyHistory = [];
        vadState.speechFrameCount = 0;
        vadState.silenceFrameCount = 0;

        // 🎤 CRITICAL: Clear transcript and restart STT to capture THIS speech!
        liveConversationState.currentTranscript = "";

        // Stop any existing STT and restart fresh
        if (liveConversationState.recognition) {
            try {
                liveConversationState.recognition.stop();
            } catch (e) { }
            isSTTActive = false;

            // Restart STT after a tiny delay to capture current speech
            setTimeout(() => {
                try {
                    liveConversationState.recognition.start();
                    isSTTActive = true;
                    console.log("🎤 STT restarted after interrupt - listening to you NOW!");
                } catch (e) {
                    console.log("STT restart error:", e);
                }
            }, 50);
        }

        // 🔥 KEEP VAD in speaking mode so it doesn't stop STT too quickly!
        vadState.isSpeaking = true;
        vadState.speechFrameCount = 5; // Pretend user has been speaking
        vadState.silenceFrameCount = 0;

        console.log("🔄 VAD + STT reset - capturing your speech!");
        return; // Don't run the STT start code below, we already handled it
    }

    // 🔥 INSTANTLY start STT if not already running (normal case, not interrupt)
    if (!isSTTActive && liveConversationState.recognition) {
        try {
            liveConversationState.recognition.start();
            isSTTActive = true;
            console.log("🎤 STT: Started (VAD triggered)");
        } catch (e) {
            // Already running - that's fine
            if (e.name === 'InvalidStateError') {
                isSTTActive = true;
            }
        }
    }

    // Visual feedback - green glow
    const liveTalkBtn = document.getElementById('live-talk-btn');
    if (liveTalkBtn) {
        liveTalkBtn.style.boxShadow = '0 0 20px #10b981';
    }
}

// Called when VAD detects silence - stop STT and process
function onVADSpeechEnd() {
    console.log("🔇 VAD: Silence detected");

    // Visual feedback - remove glow
    const liveTalkBtn = document.getElementById('live-talk-btn');
    if (liveTalkBtn) {
        liveTalkBtn.style.boxShadow = '';
    }

    // Stop STT to finalize transcript
    if (isSTTActive && liveConversationState.recognition) {
        try {
            liveConversationState.recognition.stop();
            console.log("🛑 STT: Stopped (VAD triggered)");
        } catch (e) { }
        isSTTActive = false;
    }

    // Process transcript after a short delay (let onresult finish)
    setTimeout(() => {
        const transcript = liveConversationState.currentTranscript.trim();
        if (transcript && !liveConversationState.isProcessing) {
            console.log("📝 Processing transcript:", transcript);
            processUserSpeech(transcript);
        }
    }, 100);
}

// Public function to check if user is speaking (for other parts of code)
function isUserSpeaking() {
    return vadState.isSpeaking;
}

// ===========================================
// 🗣️ SETUP WEB SPEECH API (Controlled by VAD)
// ===========================================
function setupSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    liveConversationState.recognition = new SpeechRecognition();

    const recognition = liveConversationState.recognition;

    // Configuration - VAD controls start/stop, not continuous mode
    recognition.continuous = false;          // VAD will restart as needed
    recognition.interimResults = true;       // Get partial results
    recognition.maxAlternatives = 1;

    // Detect language from browser/settings
    const browserLang = navigator.language || 'en-US';
    if (browserLang.startsWith('bn')) {
        recognition.lang = 'bn-BD';          // Bengali
    } else if (browserLang.startsWith('hi')) {
        recognition.lang = 'hi-IN';          // Hindi
    } else {
        recognition.lang = 'en-US';          // English
    }
    liveConversationState.language = recognition.lang;

    console.log(`🌐 Speech recognition language: ${recognition.lang}`);

    // Handle speech results - just accumulate transcript
    recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;

            if (event.results[i].isFinal) {
                finalTranscript += transcript;
            } else {
                interimTranscript += transcript;
            }
        }

        // Update transcripts
        if (finalTranscript) {
            liveConversationState.currentTranscript += finalTranscript + ' ';
            console.log("📝 STT Final:", finalTranscript);
        }

        liveConversationState.interimTranscript = interimTranscript;

        // Show interim results in UI
        if (interimTranscript || finalTranscript) {
            updateLiveTranscript(interimTranscript || finalTranscript, !!finalTranscript);
        }
    };

    // Handle recognition end - VAD will restart if user still speaking
    recognition.onend = () => {
        console.log("🔄 STT ended");
        isSTTActive = false;

        // If VAD says user is STILL speaking, restart immediately
        if (vadState.isSpeaking && isLiveMode) {
            try {
                recognition.start();
                isSTTActive = true;
                console.log("🔄 STT restarted (user still speaking)");
            } catch (e) { }
        }
    };

    // Handle errors - let VAD restart if needed
    recognition.onerror = (event) => {
        console.warn("⚠️ STT error:", event.error);
        isSTTActive = false;

        // Don't worry about no-speech or aborted - VAD handles restart
        if (event.error === 'no-speech' || event.error === 'aborted') {
            return;
        }
    };

    console.log("✅ Speech recognition setup complete (VAD-controlled)");
}

// ===========================================
// 🔄 SILENCE DETECTION & PROCESSING
// ===========================================
function resetSilenceTimer() {
    // Clear existing timer
    if (liveConversationState.silenceTimer) {
        clearTimeout(liveConversationState.silenceTimer);
    }

    // Set new timer
    liveConversationState.silenceTimer = setTimeout(() => {
        // Check if we have transcript to process
        const transcript = liveConversationState.currentTranscript.trim();

        if (transcript && !liveConversationState.isProcessing) {
            console.log("⏱️ Silence detected, processing:", transcript);
            processUserSpeech(transcript);
        }
    }, liveConversationState.silenceTimeout);
}

// ===========================================
// 🧠 PROCESS USER SPEECH
// ===========================================
async function processUserSpeech(transcript) {
    if (!transcript || liveConversationState.isProcessing) return;

    liveConversationState.isProcessing = true;

    // Clear transcript
    liveConversationState.currentTranscript = '';
    liveConversationState.interimTranscript = '';

    // Update state to THINKING
    setLiveState(LiveState.THINKING);

    // Mute microphone while processing
    muteMicrophone(true);

    // Show user's message
    addMessageToChat(transcript, "user");
    updateLiveTranscript('', false);

    console.log("🧠 Processing user speech:", transcript);

    try {
        // Detect language from transcript
        const isBangla = /[\u0980-\u09FF]/.test(transcript);
        const isHindi = /[\u0900-\u097F]/.test(transcript);

        // Generate AI response using existing chat system
        const response = await generateLiveResponse(transcript, isBangla || isHindi);

        if (response) {
            // Update state to SPEAKING
            setLiveState(LiveState.SPEAKING);

            // Speak the response (this will unmute mic when done)
            await speakLiveResponse(response);
        }

    } catch (error) {
        console.error("❌ Error processing speech:", error);
        addMessageToChat("Sorry, I couldn't process that. Please try again.", "teacher");
    } finally {
        liveConversationState.isProcessing = false;

        // Return to listening state
        setLiveState(LiveState.LISTENING);
        muteMicrophone(false);
        startListening();
    }
}

// ===========================================
// 🤖 GENERATE AI RESPONSE
// ===========================================
async function generateLiveResponse(userMessage, isNonEnglish = false) {
    try {
        const systemPrompt = `You are having a real-time voice conversation with a student.

VOICE CONVERSATION RULES:
- Keep responses SHORT (2-4 sentences max)
- Be conversational and natural
- If student speaks Bengali, respond in Bengali
- If student speaks Hindi, respond in Hindi
- Be warm, encouraging, and patient
- Ask follow-up questions to engage

Remember: This is voice chat, not text. Be concise!`;

        const response = await fetch('/api/gemini', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: userMessage,
                conversationHistory: conversationHistory.slice(-6),
                systemContext: systemPrompt
            })
        });

        if (response.ok) {
            const data = await response.json();
            const aiResponse = data.response || "I'm sorry, could you repeat that?";

            // Add to conversation history
            conversationHistory.push(
                { role: 'user', content: userMessage },
                { role: 'model', content: aiResponse }
            );

            return aiResponse;
        }
    } catch (error) {
        console.error("❌ Error generating response:", error);
    }

    return "I'm sorry, I couldn't understand. Could you please repeat that?";
}

// ===========================================
// 🔊 SPEAK AI RESPONSE
// ===========================================
async function speakLiveResponse(text) {
    console.log("🔊 Speaking response:", text);

    // Show in chat
    addMessageToChat(text, "teacher");

    // Teacher emotion
    if (head) {
        TeacherBehavior.setMood('explaining');
        TeacherBehavior.makeEyeContact(10000);
    }

    try {
        // Use existing TTS system
        await speakText(text);
    } catch (error) {
        console.error("❌ TTS error:", error);
    }

    // Return to neutral
    if (head) {
        TeacherBehavior.setMood('neutral');
        TeacherBehavior.startIdleBehavior();
    }
}

// ===========================================
// 🎤 MICROPHONE CONTROL
// ===========================================
function muteMicrophone(mute) {
    liveConversationState.isMicMuted = mute;

    // Don't disable audio tracks - VAD needs them for interruption detection
    // Just set the flag so recognition.onresult ignores echo

    // Only stop recognition if completely muting (not during TTS)
    // Keep recognition running so we can detect interrupts
    if (mute && !isLiveMode) {
        if (liveConversationState.recognition) {
            try {
                liveConversationState.recognition.stop();
            } catch (e) { }
        }
    }

    console.log(mute ? "🔇 Mic flag set (VAD still active for interrupts)" : "🔊 Mic flag cleared");
}

// Start listening
function startListening() {
    if (!isLiveMode || !liveConversationState.recognition) return;

    try {
        liveConversationState.recognition.start();
        liveConversationState.state = LiveState.LISTENING;
        console.log("👂 Started listening...");
    } catch (e) {
        // Already started, ignore
        if (e.name !== 'InvalidStateError') {
            console.warn("Could not start listening:", e);
        }
    }
}

// ===========================================
// 🔄 STATE MANAGEMENT
// ===========================================
function setLiveState(newState) {
    const oldState = liveConversationState.state;
    liveConversationState.state = newState;

    console.log(`📊 State: ${oldState} → ${newState}`);

    // Update UI based on state
    const liveTalkBtn = document.getElementById('live-talk-btn');
    if (liveTalkBtn) {
        switch (newState) {
            case LiveState.LISTENING:
                liveTalkBtn.innerHTML = '<span>🎤</span>';
                liveTalkBtn.title = 'Listening... (click to stop)';
                liveTalkBtn.classList.add('listening');
                liveTalkBtn.classList.remove('speaking', 'thinking');
                break;
            case LiveState.THINKING:
                liveTalkBtn.innerHTML = '<span>🧠</span>';
                liveTalkBtn.title = 'Thinking...';
                liveTalkBtn.classList.add('thinking');
                liveTalkBtn.classList.remove('listening', 'speaking');
                break;
            case LiveState.SPEAKING:
                liveTalkBtn.innerHTML = '<span>🔊</span>';
                liveTalkBtn.title = 'Speaking... (click to interrupt)';
                liveTalkBtn.classList.add('speaking');
                liveTalkBtn.classList.remove('listening', 'thinking');
                break;
            case LiveState.IDLE:
                liveTalkBtn.innerHTML = '<span>🎤</span>';
                liveTalkBtn.title = 'Start Live Voice';
                liveTalkBtn.classList.remove('listening', 'speaking', 'thinking');
                break;
        }
    }
}

// ===========================================
// 📝 UPDATE TRANSCRIPT UI
// ===========================================
function updateLiveTranscript(text, isFinal) {
    // Show interim transcript in a floating element
    let transcriptEl = document.getElementById('live-transcript');

    if (!transcriptEl) {
        transcriptEl = document.createElement('div');
        transcriptEl.id = 'live-transcript';
        transcriptEl.style.cssText = `
            position: fixed;
            bottom: 100px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 10px 20px;
            border-radius: 20px;
            font-size: 14px;
            z-index: 1000;
            max-width: 80%;
            text-align: center;
            transition: opacity 0.3s;
        `;
        document.body.appendChild(transcriptEl);
    }

    if (text) {
        transcriptEl.textContent = text;
        transcriptEl.style.opacity = '1';
    } else {
        transcriptEl.style.opacity = '0';
    }
}

// ===========================================
// 🛑 STOP LIVE CONVERSATION
// ===========================================
function stopLiveConversation() {
    console.log("🛑 Stopping Live Conversation...");

    isLiveMode = false;
    setLiveState(LiveState.IDLE);

    // Clear timers
    if (liveConversationState.silenceTimer) {
        clearTimeout(liveConversationState.silenceTimer);
        liveConversationState.silenceTimer = null;
    }

    // Stop speech recognition
    if (liveConversationState.recognition) {
        try {
            liveConversationState.recognition.stop();
        } catch (e) { }
        liveConversationState.recognition = null;
    }

    // Close audio context
    if (liveConversationState.audioContext) {
        liveConversationState.audioContext.close();
        liveConversationState.audioContext = null;
    }

    // Stop microphone
    if (liveConversationState.audioStream) {
        liveConversationState.audioStream.getTracks().forEach(track => track.stop());
        liveConversationState.audioStream = null;
    }

    // Legacy cleanup
    if (liveSession) {
        liveSession.close();
        liveSession = null;
    }
    if (audioWorklet) {
        audioWorklet.disconnect();
        audioWorklet = null;
    }
    if (audioStream) {
        audioStream.getTracks().forEach(track => track.stop());
        audioStream = null;
    }

    // Reset state
    liveConversationState.currentTranscript = '';
    liveConversationState.interimTranscript = '';
    liveConversationState.isProcessing = false;
    audioChunksBuffer = [];
    audioQueue = [];
    isPlayingAudio = false;
    isSTTActive = false;  // Reset STT flag

    // Reset VAD state
    vadState.isSpeaking = false;
    vadState.speechFrameCount = 0;
    vadState.silenceFrameCount = 0;
    vadState.previousSpectrum = null;
    vadState.energyHistory = [];

    // Remove transcript UI
    const transcriptEl = document.getElementById('live-transcript');
    if (transcriptEl) {
        transcriptEl.remove();
    }

    // Update UI
    updateLiveUI(false);

    console.log("✅ Live conversation stopped");
}

// ===========================================
// 🎨 UPDATE LIVE UI
// ===========================================
// Note: updateLiveUI function is defined earlier at line ~8305

// ===========================================
// 🔀 TOGGLE & INTERRUPT LIVE CONVERSATION
// ===========================================
function toggleLiveConversation() {
    // If AI is speaking, interrupt it
    if (liveConversationState.state === LiveState.SPEAKING) {
        console.log("⚡ User interrupted AI!");
        interruptAISpeech();
        return;
    }

    // Toggle live mode
    if (isLiveMode) {
        stopLiveConversation();
        addMessageToChat("🎤 Live voice conversation ended.", "system");
    } else {
        startLiveConversation();
    }
}

// Interrupt AI speech and return to listening
async function interruptAISpeech() {
    console.log("🛑 Interrupting AI speech...");

    // Stop any ongoing TTS
    if (head) {
        head.stopSpeaking();
    }

    // Stop any playing audio
    if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
    }

    // Reset processing flag
    liveConversationState.isProcessing = false;

    // Return to listening state immediately
    setLiveState(LiveState.LISTENING);
    muteMicrophone(false);
    startListening();

    // Visual feedback
    addMessageToChat("(You interrupted)", "system");
}

// ===========================================
// 🧠 UNIFIED AI QUIZ SYSTEM - ONE Smart AI handles everything!
// ===========================================

// Quiz conversation state (minimal)
let quizConversationState = {
    active: false,
    subject: null,
    count: null,
    isBangla: false
};

// 🎯 ONE UNIFIED QUIZ AI - handles ALL quiz conversation naturally
async function unifiedQuizAI(message, currentState = {}) {
    const isBangla = /[\u0980-\u09FF]/.test(message);

    console.log('🧠 Unified Quiz AI:', { message, currentState });

    try {
        // System instruction - role and behavior (Google recommended format)
        const systemInstruction = `You are a quiz request analyzer. Extract quiz topic and question count from student messages in any language.

Output JSON only: {"subject": string|null, "count": 5|10|15|20|null, "action": "ask_subject"|"ask_count"|"start_quiz"|"cancel", "wantsCancel": boolean, "response": "short reply"}

Rules:
- Detect cancellation intent (no, না, don't want, cancel, থাক) → wantsCancel: true
- Extract topic, remove filler words (quiz, কুইজ, প্রশ্ন, questions)
- Count must be 5, 10, 15, or 20 (detect in any language)
- Respond in the same language as the student`;

        // User prompt with context
        const userPrompt = `Current state: subject=${currentState.subject || 'null'}, count=${currentState.count || 'null'}
Student says: "${message}"`;

        const response = await fetch('/api/gemini', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ role: "user", parts: [{ text: userPrompt }] }],
                systemInstruction: { parts: [{ text: systemInstruction }] },
                generationConfig: { temperature: 0.1, maxOutputTokens: 200 }
            })
        });

        if (response.ok) {
            const data = await response.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
            const jsonMatch = text.match(/\{[\s\S]*?\}/);

            if (jsonMatch) {
                const result = JSON.parse(jsonMatch[0]);
                console.log('✅ Unified AI result:', result);

                // Force cancel if wantsCancel detected
                if (result.wantsCancel) {
                    result.action = 'cancel';
                }

                // Validate count
                if (result.count && ![5, 10, 15, 20].includes(result.count)) {
                    result.count = null;
                    if (result.action !== 'cancel') {
                        result.action = 'ask_count';
                        result.response = isBangla ? 'কয়টা প্রশ্ন? ৫, ১০, ১৫, বা ২০?' : 'How many? 5, 10, 15, or 20?';
                    }
                }

                return result;
            }
        }
    } catch (error) {
        console.error('❌ Unified Quiz AI error:', error);
    }

    // Fallback - simple detection
    return fallbackQuizAnalysis(message, currentState, isBangla);
}

// Fallback if AI fails - Enhanced multilingual support
function fallbackQuizAnalysis(message, state, isBangla) {
    const msg = message.toLowerCase();
    const originalMsg = message;

    // CANCELLATION DETECTION (Multiple languages)
    const cancelPatterns = [
        // English
        /\b(no|not|don'?t|won'?t|cancel|stop|never\s*mind|forget\s*it|quit|exit)\b/i,
        // Bengali
        /(না|নাহ|চাই\s*না|বাদ|থাক|লাগবে\s*না|করব\s*না|দরকার\s*না)/i,
        // Hindi
        /(नहीं|नहीं\s*चाहिए|रहने\s*दो|छोड़ो|बंद)/i,
        // Arabic
        /(لا|لا\s*أريد|الغاء|توقف)/i,
        // Spanish
        /\b(no\s*quiero|cancelar|parar|detener)\b/i,
        // French
        /\b(non|ne\s*veux\s*pas|annuler|arrêter)\b/i
    ];

    for (const pattern of cancelPatterns) {
        if (pattern.test(originalMsg)) {
            return {
                subject: null, count: null, action: 'cancel', wantsCancel: true,
                response: isBangla ? 'ঠিক আছে! কুইজ বাদ। 😊' : 'Okay! No quiz. 😊'
            };
        }
    }

    // Check for learn intent (not quiz)
    if (msg.match(/\b(learn|teach|explain|শিখ|শেখা|শেখাও|بتعلم|aprender|apprendre)\b/i)) {
        return {
            subject: null, count: null, action: 'cancel', wantsCancel: true,
            response: isBangla ? 'চলো শিখি!' : "Let's learn!"
        };
    }

    // COUNT EXTRACTION (Multiple languages)
    let count = null;
    // Check for 20 first (longer patterns)
    if (originalMsg.match(/(20|twenty|২০|বিশ|बीस|٢٠|عشرون|veinte|vingt|二十|스물|двадцать)/i)) count = 20;
    else if (originalMsg.match(/(15|fifteen|১৫|পনের|पंद्रह|١٥|خمسة\s*عشر|quince|quinze|十五|열다섯|пятнадцать)/i)) count = 15;
    else if (originalMsg.match(/(10|ten|১০|দশ|दस|١٠|عشرة|diez|dix|十|열|десять)/i)) count = 10;
    else if (originalMsg.match(/(5|five|৫|পাঁচ|पांच|٥|خمسة|cinco|cinq|五|다섯|пять)/i)) count = 5;

    // If we have count and already have subject → start
    if (count && state.subject) {
        return {
            subject: state.subject, count: count, action: 'start_quiz',
            response: isBangla ? `চলো ${state.subject} কুইজ শুরু!` : `Starting ${state.subject} quiz!`
        };
    }

    // If waiting for subject, treat message as subject
    if (!state.subject && message.trim().length > 1) {
        const subject = message.trim();
        if (count) {
            return {
                subject: subject, count: count, action: 'start_quiz',
                response: isBangla ? `চলো ${subject} কুইজ শুরু!` : `Starting ${subject} quiz!`
            };
        }
        return {
            subject: subject, count: null, action: 'ask_count',
            response: isBangla ? `${subject} কুইজ! কয়টা প্রশ্ন?` : `${subject} quiz! How many questions?`
        };
    }

    // Default - ask for what's missing
    if (!state.subject) {
        return {
            subject: null, count: count, action: 'ask_subject',
            response: isBangla ? 'কোন বিষয়ে কুইজ দিবে?' : 'What topic for the quiz?'
        };
    }

    return {
        subject: state.subject, count: null, action: 'ask_count',
        response: isBangla ? 'কয়টা প্রশ্ন? ৫, ১০, ১৫, বা ২০?' : 'How many? 5, 10, 15, or 20?'
    };
}

// 🎯 MAIN QUIZ HANDLER - Uses unified AI
async function processQuizMode(message) {
    const isBangla = /[\u0980-\u09FF]/.test(message);
    console.log("🎯 Quiz Mode triggered:", message);

    // Start quiz conversation
    quizConversationState = { active: true, subject: null, count: null, isBangla };

    // Let AI analyze the initial request
    const result = await unifiedQuizAI(message, quizConversationState);

    // Update state with AI results
    if (result.subject) quizConversationState.subject = result.subject;
    if (result.count) quizConversationState.count = result.count;

    // Handle action
    await handleQuizAction(result);
}

// 🎯 QUIZ CONVERSATION HANDLER - Single entry point
async function handleQuizConversation(message) {
    if (!quizConversationState.active) return false;

    console.log('💬 Quiz conversation:', message, quizConversationState);

    // Let AI analyze in context
    const result = await unifiedQuizAI(message, quizConversationState);

    // Update state
    if (result.subject) quizConversationState.subject = result.subject;
    if (result.count) quizConversationState.count = result.count;

    // Handle action
    await handleQuizAction(result);
    return true;
}

// 🎯 Handle quiz actions from AI
async function handleQuizAction(result) {
    const isBangla = quizConversationState.isBangla;

    console.log('🎬 Quiz Action:', result.action);

    switch (result.action) {
        case 'cancel':
            quizConversationState.active = false;
            addMessageToChat(result.response, "teacher");
            if (head) speakText(result.response.replace(/[😊🎯]/g, ''));
            break;

        case 'ask_subject':
            addMessageToChat(result.response, "teacher");
            if (head) speakText(result.response.replace(/[😊🎯]/g, ''));
            break;

        case 'ask_count':
            addMessageToChat(result.response, "teacher");
            if (head) speakText(result.response.replace(/[😊🎯]/g, ''));
            break;

        case 'change_subject':
            addMessageToChat(result.response, "teacher");
            if (head) speakText(result.response.replace(/[😊🎯]/g, ''));
            break;

        case 'start_quiz':
            quizConversationState.active = false;
            const subject = quizConversationState.subject || result.subject;
            const count = quizConversationState.count || result.count || 5;

            const confirmMsg = isBangla
                ? `চলো! **${subject}** থেকে ${count}টা প্রশ্নের কুইজ শুরু! 🎯`
                : `Let's go! Starting ${count} questions quiz on **${subject}**! 🎯`;
            addMessageToChat(confirmMsg, "teacher");
            if (head) speakText(isBangla ? `${subject} কুইজ শুরু!` : `Starting ${subject} quiz!`);

            setTimeout(() => {
                generateAndShowQuiz(subject, subject, count);
            }, 500);
            break;

        default:
            // Unknown action, ask for clarification
            const defaultMsg = isBangla ? 'কোন বিষয়ে কুইজ দিতে চাও?' : 'What topic would you like the quiz on?';
            addMessageToChat(defaultMsg, "teacher");
            if (head) speakText(defaultMsg);
    }
}

// Quiz overlay state
let quizOverlayState = {
    subject: '',
    topic: '',
    currentIndex: 0,
    score: 0,
    answers: [],
    questions: [],
    startTime: null
};

// Generate quiz and show in overlay
async function generateAndShowQuiz(subject, topic, count) {
    // Check credits
    const user = getCurrentUser();
    const canProceed = await canPerformAction('quizAttempt');

    if (!canProceed.allowed) {
        showUpgradePrompt(canProceed.reason);
        return;
    }

    if (!canProceed.unlimited) {
        const userId = user?.uid || null;
        await deductCredits(userId, 'quizAttempt');
        updateCreditsDisplay();
    }

    addMessageToChat(`📝 Creating ${count} questions for you on **${subject}**... Please wait! ✨`, "teacher");

    if (head) {
        await speakText(`Creating ${count} questions for you. Please wait!`);
    }

    const quizModel = getModelForTask('chat');

    try {
        await quizEngine.generateQuiz(
            async (prompt) => {
                const body = {
                    contents: [{ role: "user", parts: [{ text: prompt }] }],
                    generationConfig: buildGenerationConfig('chat')
                };
                const response = await callGeminiAPI(quizModel, body, false);
                const data = await response.json();
                return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
            },
            subject,
            topic,
            count,
            'medium'
        );

        // Initialize overlay state
        quizOverlayState = {
            subject: subject,
            topic: topic,
            currentIndex: 0,
            score: 0,
            answers: new Array(quizEngine.currentQuiz.questions.length).fill(null),
            questions: quizEngine.currentQuiz.questions,
            startTime: new Date()
        };

        // Show the magic quiz overlay
        showQuizOverlay();

        // Also show all questions in chat (for saving to history)
        let quizChatContent = `📝 **Quiz: ${subject}** (${count} questions)\n\n`;
        quizOverlayState.questions.forEach((q, i) => {
            quizChatContent += `**Q${i + 1}.** ${q.question}\n`;
            q.options.forEach((opt, j) => {
                const letter = String.fromCharCode(65 + j);
                quizChatContent += `   ${letter}) ${opt.replace(/^[A-D]\)\s*/i, '')}\n`;
            });
            quizChatContent += '\n';
        });

        // Save quiz questions to chat (type: quiz for special handling)
        currentChatMessages.push({
            role: "model",
            content: quizChatContent,
            type: "quiz",
            quizData: {
                subject: subject,
                topic: topic,
                questions: quizOverlayState.questions,
                count: count
            },
            timestamp: new Date().toISOString()
        });

        addMessageToChat(`✅ Quiz ready! I've created ${count} questions for you. Answer them in the quiz panel! 🎯`, "teacher");

        if (head) {
            TeacherBehavior.setMood('happy');
            // Only announce quiz is ready - don't read questions
            await speakText(`Quiz ready! ${count} questions for you. Good luck!`);
            setTimeout(() => TeacherBehavior.setMood('neutral'), 2000);
        }

    } catch (error) {
        console.error("Quiz generation error:", error);
        addMessageToChat("❌ Sorry, I couldn't generate the quiz. Let's try again!", "system");
    }
}

// Show quiz overlay (like magic image)
function showQuizOverlay() {
    const overlay = document.getElementById('magic-quiz-overlay');

    // Update header
    document.getElementById('quiz-overlay-subject').textContent = quizOverlayState.subject;
    document.getElementById('quiz-overlay-topic').textContent = quizOverlayState.topic;
    document.getElementById('quiz-overlay-total').textContent = quizOverlayState.questions.length;

    // Render first question
    renderQuizOverlayQuestion(0);
    renderQuizOverlayDots();
    updateQuizOverlayStats();

    // Show overlay
    overlay.classList.remove('hidden');
    document.body.classList.add('quiz-overlay-active');

    // On mobile, auto-close chat panel
    if (window.innerWidth <= 480) {
        const chatPanel = document.querySelector('.hologram-panel');
        if (chatPanel) {
            chatPanel.classList.add('hidden-by-overlay');
        }
    }

    requestAnimationFrame(() => {
        overlay.classList.add('visible');
    });

    console.log("📝 Quiz overlay shown");
}

// Hide quiz overlay
function hideQuizOverlay() {
    const overlay = document.getElementById('magic-quiz-overlay');
    overlay.classList.remove('visible');
    document.body.classList.remove('quiz-overlay-active');

    // On mobile, restore chat panel
    if (window.innerWidth <= 480) {
        const chatPanel = document.querySelector('.hologram-panel');
        if (chatPanel) {
            chatPanel.classList.remove('hidden-by-overlay');
        }
    }

    setTimeout(() => {
        overlay.classList.add('hidden');
    }, 500);

    quizEngine.resetQuiz();
}

// Hide results overlay
function hideResultsOverlay() {
    const overlay = document.getElementById('quiz-results-overlay');
    overlay.classList.remove('visible');

    // On mobile, restore chat panel
    if (window.innerWidth <= 480) {
        const chatPanel = document.querySelector('.hologram-panel');
        if (chatPanel) {
            chatPanel.classList.remove('hidden-by-overlay');
        }
    }

    setTimeout(() => {
        overlay.classList.add('hidden');
    }, 500);
}

// Render current question in overlay
function renderQuizOverlayQuestion(idx) {
    const q = quizOverlayState.questions[idx];
    if (!q) return;

    quizOverlayState.currentIndex = idx;

    // Update question number and text
    document.getElementById('quiz-overlay-q-num').textContent = `Question ${idx + 1}`;
    document.getElementById('quiz-overlay-q-text').textContent = q.question;

    // Clean option text (remove A) B) etc if present)
    const cleanOptions = q.options.map(opt => {
        return opt.replace(/^[A-D]\)\s*/i, '').trim();
    });

    // Render options
    const optionsContainer = document.getElementById('quiz-overlay-options');
    const existingAnswer = quizOverlayState.answers[idx];
    const correctAnswer = q.correct.toUpperCase();

    optionsContainer.innerHTML = cleanOptions.map((opt, i) => {
        const letter = String.fromCharCode(65 + i);
        let classes = 'quiz-option-btn';

        if (existingAnswer) {
            classes += ' disabled';
            if (letter === existingAnswer.userAnswer) {
                classes += existingAnswer.isCorrect ? ' correct' : ' wrong';
            }
            if (letter === correctAnswer && !existingAnswer.isCorrect) {
                classes += ' correct';
            }
        }

        return `
            <button class="${classes}" data-answer="${letter}">
                <span class="opt-letter">${letter}</span>
                <span class="opt-text">${opt}</span>
            </button>
        `;
    }).join('');

    // Add click handlers (only if not answered)
    if (!existingAnswer) {
        optionsContainer.querySelectorAll('.quiz-option-btn').forEach(btn => {
            btn.addEventListener('click', handleQuizOverlayOptionClick);
        });
    }

    // Update navigation buttons
    document.getElementById('quiz-overlay-prev').disabled = idx === 0;
    document.getElementById('quiz-overlay-next').disabled = idx === quizOverlayState.questions.length - 1;

    // Update dots
    updateQuizOverlayDots();
}

// Render navigation dots
function renderQuizOverlayDots() {
    const container = document.getElementById('quiz-overlay-dots');
    container.innerHTML = '';

    quizOverlayState.questions.forEach((_, idx) => {
        const dot = document.createElement('button');
        dot.className = 'quiz-dot' + (idx === 0 ? ' active' : '');
        dot.addEventListener('click', () => renderQuizOverlayQuestion(idx));
        container.appendChild(dot);
    });
}

// Update dots state
function updateQuizOverlayDots() {
    document.querySelectorAll('.quiz-dot').forEach((dot, i) => {
        dot.classList.toggle('active', i === quizOverlayState.currentIndex);

        const answer = quizOverlayState.answers[i];
        if (answer) {
            dot.classList.add('answered');
            if (!answer.isCorrect) dot.classList.add('wrong');
        }
    });
}

// Update stats display
function updateQuizOverlayStats() {
    document.getElementById('quiz-overlay-current').textContent = quizOverlayState.currentIndex + 1;
    document.getElementById('quiz-overlay-score').textContent = quizOverlayState.score;
}

// Handle option click
async function handleQuizOverlayOptionClick(e) {
    const btn = e.currentTarget;
    const answer = btn.dataset.answer;
    const idx = quizOverlayState.currentIndex;
    const question = quizOverlayState.questions[idx];
    const correctAnswer = question.correct.toUpperCase();
    const isCorrect = answer === correctAnswer;

    // Store answer
    quizOverlayState.answers[idx] = {
        userAnswer: answer,
        correctAnswer: correctAnswer,
        isCorrect: isCorrect
    };

    if (isCorrect) {
        quizOverlayState.score++;
    }

    // Show answer in chat (for history)
    const icon = isCorrect ? '✅' : '❌';
    const answerMsg = `${icon} **Q${idx + 1}:** Your answer: **${answer}** ${isCorrect ? '(Correct!)' : `(Wrong - Correct: ${correctAnswer})`}`;
    addMessageToChat(answerMsg, "teacher");

    // Disable all options
    document.querySelectorAll('.quiz-option-btn').forEach(b => {
        b.classList.add('disabled');
    });

    // Mark correct/wrong
    btn.classList.add(isCorrect ? 'correct' : 'wrong');
    if (!isCorrect) {
        document.querySelector(`[data-answer="${correctAnswer}"]`)?.classList.add('correct');
    }

    // Update stats
    updateQuizOverlayStats();
    updateQuizOverlayDots();

    // Show feedback toast
    showQuizFeedbackToast(isCorrect, question.explanation);

    // Teacher speaks feedback
    if (head) {
        if (isCorrect) {
            TeacherBehavior.setMood('happy');
            await speakText("Correct!");
        } else {
            TeacherBehavior.setMood('sad');
            await speakText(`Wrong. The answer is ${correctAnswer}`);
        }
        setTimeout(() => TeacherBehavior.setMood('neutral'), 1500);
    }

    // Check if quiz is complete
    const allAnswered = quizOverlayState.answers.every(a => a !== null);

    if (allAnswered) {
        // Show results after a short delay
        setTimeout(() => {
            showQuizResults();
        }, 1500);
    } else {
        // Auto advance to next unanswered question (silently)
        setTimeout(() => {
            const nextUnanswered = quizOverlayState.answers.findIndex(a => a === null);
            if (nextUnanswered !== -1) {
                renderQuizOverlayQuestion(nextUnanswered);
                // Don't read questions - let student read silently
            }
        }, 1200);
    }
}

// Show feedback toast
function showQuizFeedbackToast(isCorrect, explanation) {
    const existing = document.querySelector('.quiz-feedback-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `quiz-feedback-toast ${isCorrect ? 'correct' : 'wrong'}`;
    toast.textContent = isCorrect ? '✅ Correct!' : '❌ Wrong!';

    document.querySelector('.quiz-overlay-content').appendChild(toast);

    setTimeout(() => toast.remove(), 1500);
}

// Show quiz results
async function showQuizResults() {
    hideQuizOverlay();

    const total = quizOverlayState.questions.length;
    const correct = quizOverlayState.score;
    const percentage = Math.round((correct / total) * 100);

    // Calculate grade
    let grade, message;
    if (percentage >= 90) {
        grade = 'A+'; message = '🌟 Excellent! You mastered this topic!';
    } else if (percentage >= 80) {
        grade = 'A'; message = '👏 Great job! Strong understanding!';
    } else if (percentage >= 70) {
        grade = 'B'; message = '👍 Good work! Keep practicing!';
    } else if (percentage >= 60) {
        grade = 'C'; message = '📚 Not bad! More study needed!';
    } else if (percentage >= 50) {
        grade = 'D'; message = '💪 Keep trying! Review the topic!';
    } else {
        grade = 'F'; message = '🤗 Don\'t worry! Let\'s review together!';
    }

    // Calculate duration
    const duration = Math.floor((new Date() - quizOverlayState.startTime) / 1000);
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    // Update results overlay
    document.getElementById('results-score-percent').textContent = `${percentage}%`;
    document.getElementById('results-grade-letter').textContent = grade;
    document.getElementById('results-correct-count').textContent = correct;
    document.getElementById('results-wrong-count').textContent = total - correct;
    document.getElementById('results-time-taken').textContent = timeStr;
    document.getElementById('results-message-text').textContent = message;

    // Show results overlay
    const resultsOverlay = document.getElementById('quiz-results-overlay');
    resultsOverlay.classList.remove('hidden');
    requestAnimationFrame(() => {
        resultsOverlay.classList.add('visible');
    });

    // Save to Firebase
    if (getCurrentUser()) {
        try {
            await saveQuizResult(
                quizOverlayState.subject,
                quizOverlayState.topic,
                correct,
                total,
                timeStr,
                quizOverlayState.answers
            );
            console.log("💾 Quiz saved");
        } catch (error) {
            console.error("❌ Quiz save error:", error);
        }
    }

    // Teacher announces result
    if (head) {
        if (percentage >= 70) TeacherBehavior.setMood('happy');
        await speakText(`Quiz complete! You scored ${correct} out of ${total}. ${message}`);
        setTimeout(() => TeacherBehavior.setMood('neutral'), 3000);
    }

    // Add quiz result to chat with full data (for saving)
    const resultContent = `📊 **Quiz Complete: ${quizOverlayState.subject}**\n\nScore: ${correct}/${total} (${percentage}%)\nGrade: ${grade}\nTime: ${timeStr}\n\n${message}`;
    addMessageToChat(resultContent, "teacher");

    // Save complete quiz result to chat messages
    currentChatMessages.push({
        role: "model",
        content: resultContent,
        type: "quiz_result",
        quizResult: {
            subject: quizOverlayState.subject,
            topic: quizOverlayState.topic,
            score: correct,
            total: total,
            percentage: percentage,
            grade: grade,
            time: timeStr,
            answers: quizOverlayState.answers,
            questions: quizOverlayState.questions
        },
        timestamp: new Date().toISOString()
    });

    // Trigger auto-save
    clearTimeout(window.autoSaveTimeout);
    window.autoSaveTimeout = setTimeout(() => {
        autoSaveChat();
    }, 1000);

    quizEngine.resetQuiz();
}

// Initialize quiz overlay listeners
function initQuizOverlayListeners() {
    // Close button
    document.getElementById('close-quiz-overlay')?.addEventListener('click', hideQuizOverlay);

    // Navigation buttons
    document.getElementById('quiz-overlay-prev')?.addEventListener('click', () => {
        if (quizOverlayState.currentIndex > 0) {
            renderQuizOverlayQuestion(quizOverlayState.currentIndex - 1);
        }
    });

    document.getElementById('quiz-overlay-next')?.addEventListener('click', () => {
        if (quizOverlayState.currentIndex < quizOverlayState.questions.length - 1) {
            renderQuizOverlayQuestion(quizOverlayState.currentIndex + 1);
        }
    });

    // Results buttons
    document.getElementById('quiz-close-btn')?.addEventListener('click', hideResultsOverlay);
    document.getElementById('quiz-review-btn')?.addEventListener('click', () => {
        // Show review in chat
        hideResultsOverlay();
        let reviewMsg = "📋 **Quiz Review:**\n\n";
        quizOverlayState.questions.forEach((q, i) => {
            const ans = quizOverlayState.answers[i];
            const icon = ans?.isCorrect ? '✅' : '❌';
            reviewMsg += `${icon} **Q${i + 1}:** ${q.question}\n`;
            reviewMsg += `Your answer: ${ans?.userAnswer || 'N/A'} | Correct: ${q.correct}\n`;
            if (q.explanation) reviewMsg += `💡 ${q.explanation}\n`;
            reviewMsg += '\n';
        });
        addMessageToChat(reviewMsg, "teacher");
    });
}

// Expose globally
window.handleQuizConversation = handleQuizConversation;

document.addEventListener("DOMContentLoaded", () => {
    // Load saved voice settings first
    loadVoiceSettings();

    // initializeLightRays(); // Disabled - using classroom GLB
    createParticleStars();
    init();

    // Setup Live Talk button
    const liveTalkBtn = document.getElementById('live-talk-btn');
    if (liveTalkBtn) {
        liveTalkBtn.addEventListener('click', toggleLiveConversation);
    }

    // Initialize Quiz Overlay listeners
    initQuizOverlayListeners();
});