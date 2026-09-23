


export const INTENT_TYPES = {
    RESEARCH: 'research',      // Deep research mode (async, 1-2 min)
    CURRICULUM: 'curriculum',
    FILE: 'file',
    QUIZ: 'quiz',              // Quiz mode
    CHAT: 'chat'
};


const RESEARCH_KEYWORDS = [
    'research', 'comprehensive', 'in-depth', 'thoroughly', 'explore deeply',
    'detailed analysis', 'investigate', 'in detail', 'extensively',
    'deep dive', 'elaborate', 'comprehensive study', 'research on',
    'গবেষণা', 'বিস্তারিত' // Bangla
];

const CURRICULUM_KEYWORDS = [
    'class', 'chapter', 'textbook', 'nctb', 'ncert', 'cbse', 'board',
    'homework', 'lesson', 'syllabus', 'exam', 'ssc', 'hsc', 'gcse',
    'teach me from book', 'from my textbook', 'curriculum',
    'শ্রেণী', 'অধ্যায়', 'পাঠ্যবই'
];

const FILE_KEYWORDS = [
    'my file', 'my homework', 'this question', 'uploaded', 'the document',
    'this image', 'my notes', 'the pdf', 'this picture', 'from this',
    'analyze this', 'read this', 'help with this file',
    'আমার ফাইল', 'এই ছবি'
];

const QUIZ_KEYWORDS = [
    'quiz me', 'test me', 'quiz', 'test my knowledge', 'examine me',
    'ask me questions', 'check my understanding', 'assessment',
    'পরীক্ষা', 'প্রশ্ন করো', 'কুইজ', 'কুইজ দাও', 'কুইজ দিতে চাই', 'কুইজ খেলি' // Bangla
];


export function detectIntent(message, context = {}) {
    const msgLower = message.toLowerCase();


    if (hasKeywords(msgLower, RESEARCH_KEYWORDS)) {
        return {
            type: INTENT_TYPES.RESEARCH,
            confidence: 0.9,
            async: true,
            estimatedTime: '1-2 minutes',
            icon: '🔬',
            description: 'Deep Research Mode'
        };
    }

    // Priority 2: File mode (if file is uploaded or mentioned)
    if (context.hasUploadedFile || hasKeywords(msgLower, FILE_KEYWORDS)) {
        return {
            type: INTENT_TYPES.FILE,
            confidence: 0.85,
            async: false,
            estimatedTime: '3-5 seconds',
            icon: '📄',
            description: 'File Analysis Mode'
        };
    }


    if (hasKeywords(msgLower, QUIZ_KEYWORDS)) {
        return {
            type: INTENT_TYPES.QUIZ,
            confidence: 0.9,
            async: false,
            estimatedTime: '5-10 seconds',
            icon: '📝',
            description: 'Quiz Mode'
        };
    }


    if (hasKeywords(msgLower, CURRICULUM_KEYWORDS) || context.hasActiveTextbook) {
        // Try to extract class/chapter info
        const curriculumInfo = extractCurriculumInfo(message);
        return {
            type: INTENT_TYPES.CURRICULUM,
            confidence: 0.85,
            async: false,
            estimatedTime: '3-5 seconds',
            icon: '📚',
            description: 'Curriculum Mode',
            metadata: curriculumInfo
        };
    }


    return {
        type: INTENT_TYPES.CHAT,
        confidence: 1.0,
        async: false,
        estimatedTime: '2-3 seconds',
        icon: '💬',
        description: 'Chat Mode'
    };
}


function hasKeywords(message, keywords) {
    return keywords.some(keyword => message.includes(keyword.toLowerCase()));
}

/**
 * Extract curriculum information from message
 */
export function extractCurriculumInfo(message) {
    const msgLower = message.toLowerCase();
    const info = {
        class: null,
        subject: null,
        chapter: null,
        topic: null
    };


    const classPatterns = [
        /class\s*(\d+)/i,
        /grade\s*(\d+)/i,
        /শ্রেণী\s*(\d+)/i,
        /(\d+)(?:th|st|nd|rd)?\s*class/i
    ];

    for (const pattern of classPatterns) {
        const match = message.match(pattern);
        if (match) {
            info.class = parseInt(match[1]);
            break;
        }
    }


    const subjects = [
        'physics', 'chemistry', 'biology', 'mathematics', 'math', 'maths',
        'english', 'bangla', 'bengali', 'history', 'geography', 'ict',
        'computer', 'economics', 'accounting', 'science', 'social'
    ];

    for (const subject of subjects) {
        if (msgLower.includes(subject)) {
            info.subject = subject;
            break;
        }
    }

    // Extract chapter number
    const chapterPatterns = [
        /chapter\s*(\d+)/i,
        /ch\.?\s*(\d+)/i,
        /অধ্যায়\s*(\d+)/i
    ];

    for (const pattern of chapterPatterns) {
        const match = message.match(pattern);
        if (match) {
            info.chapter = parseInt(match[1]);
            break;
        }
    }

    return info;
}


export function getModeButtons() {
    return [
        {
            id: 'curriculum',
            icon: '📚',
            label: 'Curriculum',
            shortLabel: 'CURRIC',
            time: '3-5sec',
            description: 'Learn from textbooks'
        },
        {
            id: 'file',
            icon: '📄',
            label: 'My Files',
            shortLabel: 'FILE',
            time: '3-5sec',
            description: 'Upload & analyze'
        },
        {
            id: 'research',
            icon: '🔬',
            label: 'Research',
            shortLabel: 'RESEARCH',
            time: '1-2min',
            description: 'Deep exploration'
        },
        {
            id: 'chat',
            icon: '💬',
            label: 'Chat',
            shortLabel: 'CHAT',
            time: '2-3sec',
            description: 'Normal conversation',
            default: true
        }
    ];
}

export default { detectIntent, extractCurriculumInfo, getModeButtons, INTENT_TYPES };
