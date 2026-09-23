

import { progressTracker } from './progressTracker.js';


export class QuizEngine {
    constructor() {
        this.currentQuiz = null;
        this.currentQuestionIndex = 0;
        this.answers = [];
    }

    /**
     * Generate quiz questions using AI
     * @param {Function} aiCall - Function to call AI API
     * @param {string} subject - Subject name
     * @param {string} topic - Topic name
     * @param {number} count - Number of questions
     * @param {string} difficulty - Difficulty level (easy, medium, hard)
     * @param {string} language - Language code for quiz (optional)
     */
    async generateQuiz(aiCall, subject, topic, count = 5, difficulty = 'medium', language = null) {
        // Detect language from subject/topic if not provided
        const langCode = language || this.detectLanguage(subject + ' ' + topic);
        const langInstruction = this.getLanguageInstruction(langCode);

        const prompt = `Generate ${count} multiple choice quiz questions about "${topic}" in ${subject}.

Difficulty: ${difficulty}
${langInstruction}

IMPORTANT: Return ONLY valid JSON array, no other text.

Format:
[
  {
    "question": "Question text here?",
    "options": ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
    "correct": "A",
    "explanation": "Brief explanation of why this is correct"
  }
]

Make questions educational and appropriate for students.`;

        try {
            const response = await aiCall(prompt);

            
            const jsonMatch = response.match(/\[[\s\S]*\]/);
            if (!jsonMatch) {
                throw new Error('Could not parse quiz JSON');
            }

            const questions = JSON.parse(jsonMatch[0]);

            this.currentQuiz = {
                subject,
                topic,
                difficulty,
                language: langCode,
                questions,
                startTime: new Date().toISOString()
            };

            this.currentQuestionIndex = 0;
            this.answers = [];

            return this.currentQuiz;
        } catch (error) {
            console.error('Error generating quiz:', error);
            throw error;
        }
    }

    // Detect language from text
    detectLanguage(text) {
        if (/[\u0980-\u09FF]/.test(text)) return 'bn'; // Bengali
        if (/[\u0900-\u097F]/.test(text)) return 'hi'; // Hindi
        if (/[\u0600-\u06FF]/.test(text)) return 'ar'; // Arabic
        if (/[\u4e00-\u9fff]/.test(text)) return 'zh'; // Chinese
        if (/[\u3040-\u309F\u30A0-\u30FF]/.test(text)) return 'ja'; // Japanese
        if (/[\uAC00-\uD7AF]/.test(text)) return 'ko'; // Korean
        if (/[\u0E00-\u0E7F]/.test(text)) return 'th'; // Thai
        if (/[\u0400-\u04FF]/.test(text)) return 'ru'; // Russian/Cyrillic
        if (/[\u0B80-\u0BFF]/.test(text)) return 'ta'; // Tamil
        if (/[\u0C00-\u0C7F]/.test(text)) return 'te'; // Telugu
        return 'en'; // Default English
    }

    // Get language instruction for quiz generation
    getLanguageInstruction(langCode) {
        const langInstructions = {
            'bn': 'LANGUAGE: Generate ALL questions, options, and explanations in Bengali (বাংলা).',
            'hi': 'LANGUAGE: Generate ALL questions, options, and explanations in Hindi (हिंदी).',
            'ar': 'LANGUAGE: Generate ALL questions, options, and explanations in Arabic (العربية).',
            'zh': 'LANGUAGE: Generate ALL questions, options, and explanations in Chinese (中文).',
            'ja': 'LANGUAGE: Generate ALL questions, options, and explanations in Japanese (日本語).',
            'ko': 'LANGUAGE: Generate ALL questions, options, and explanations in Korean (한국어).',
            'th': 'LANGUAGE: Generate ALL questions, options, and explanations in Thai (ไทย).',
            'ru': 'LANGUAGE: Generate ALL questions, options, and explanations in Russian (Русский).',
            'ta': 'LANGUAGE: Generate ALL questions, options, and explanations in Tamil (தமிழ்).',
            'te': 'LANGUAGE: Generate ALL questions, options, and explanations in Telugu (తెలుగు).',
            'es': 'LANGUAGE: Generate ALL questions, options, and explanations in Spanish (Español).',
            'fr': 'LANGUAGE: Generate ALL questions, options, and explanations in French (Français).',
            'de': 'LANGUAGE: Generate ALL questions, options, and explanations in German (Deutsch).',
            'pt': 'LANGUAGE: Generate ALL questions, options, and explanations in Portuguese (Português).',
            'vi': 'LANGUAGE: Generate ALL questions, options, and explanations in Vietnamese (Tiếng Việt).',
            'id': 'LANGUAGE: Generate ALL questions, options, and explanations in Indonesian (Bahasa Indonesia).',
            'tr': 'LANGUAGE: Generate ALL questions, options, and explanations in Turkish (Türkçe).',
            'en': '' // Default English - no special instruction needed
        };
        return langInstructions[langCode] || '';
    }

    
    getCurrentQuestion() {
        if (!this.currentQuiz || this.currentQuestionIndex >= this.currentQuiz.questions.length) {
            return null;
        }

        return {
            index: this.currentQuestionIndex,
            total: this.currentQuiz.questions.length,
            ...this.currentQuiz.questions[this.currentQuestionIndex]
        };
    }

    /**
     * Submit answer for current question
     * @param {string} answer - Selected answer (A, B, C, or D)
     */
    submitAnswer(answer) {
        if (!this.currentQuiz) return null;

        const question = this.currentQuiz.questions[this.currentQuestionIndex];
        const isCorrect = answer.toUpperCase() === question.correct.toUpperCase();

        this.answers.push({
            questionIndex: this.currentQuestionIndex,
            userAnswer: answer,
            correctAnswer: question.correct,
            isCorrect,
            question: question.question
        });

        
        progressTracker.updateMastery(
            this.currentQuiz.subject,
            this.currentQuiz.topic,
            isCorrect
        );

        const result = {
            isCorrect,
            correctAnswer: question.correct,
            explanation: question.explanation,
            hasNext: this.currentQuestionIndex < this.currentQuiz.questions.length - 1
        };

        this.currentQuestionIndex++;

        return result;
    }

    
    getResults() {
        if (!this.currentQuiz) return null;

        const correct = this.answers.filter(a => a.isCorrect).length;
        const total = this.currentQuiz.questions.length;
        const percentage = (correct / total) * 100;

        // Record quiz in progress tracker
        progressTracker.recordQuiz(
            this.currentQuiz.subject,
            this.currentQuiz.questions.length,
            correct,
            total
        );

        
        let grade, message;
        if (percentage >= 90) {
            grade = 'A+';
            message = 'Excellent! You have mastered this topic!';
        } else if (percentage >= 80) {
            grade = 'A';
            message = 'Great job! You have a strong understanding!';
        } else if (percentage >= 70) {
            grade = 'B';
            message = 'Good work! A bit more practice will help!';
        } else if (percentage >= 60) {
            grade = 'C';
            message = 'Not bad! Keep studying to improve!';
        } else if (percentage >= 50) {
            grade = 'D';
            message = 'You need more practice. Let\'s review the topic!';
        } else {
            grade = 'F';
            message = 'Don\'t worry! Let\'s go through the material again.';
        }

        return {
            subject: this.currentQuiz.subject,
            topic: this.currentQuiz.topic,
            difficulty: this.currentQuiz.difficulty,
            correct,
            total,
            percentage: percentage.toFixed(1),
            grade,
            message,
            answers: this.answers,
            duration: this.calculateDuration()
        };
    }

    
    calculateDuration() {
        if (!this.currentQuiz?.startTime) return '0:00';

        const start = new Date(this.currentQuiz.startTime);
        const end = new Date();
        const seconds = Math.floor((end - start) / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;

        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    /**
     * Reset quiz
     */
    resetQuiz() {
        this.currentQuiz = null;
        this.currentQuestionIndex = 0;
        this.answers = [];
    }

    
    async generateReviewQuiz(aiCall, recentTopics, count = 5) {
        if (!recentTopics || recentTopics.length === 0) {
            throw new Error('No topics to review');
        }

        const topicList = recentTopics.map(t => `${t.subject}: ${t.topic}`).join(', ');

        const prompt = `Generate ${count} mixed review questions covering these topics: ${topicList}

IMPORTANT: Return ONLY valid JSON array, no other text.

Format:
[
  {
    "question": "Question text here?",
    "options": ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
    "correct": "A",
    "explanation": "Brief explanation",
    "topic": "Which topic this question is about"
  }
]`;

        try {
            const response = await aiCall(prompt);
            const jsonMatch = response.match(/\[[\s\S]*\]/);
            if (!jsonMatch) {
                throw new Error('Could not parse quiz JSON');
            }

            const questions = JSON.parse(jsonMatch[0]);

            this.currentQuiz = {
                subject: 'Review',
                topic: 'Mixed Topics',
                difficulty: 'mixed',
                questions,
                startTime: new Date().toISOString()
            };

            this.currentQuestionIndex = 0;
            this.answers = [];

            return this.currentQuiz;
        } catch (error) {
            console.error('Error generating review quiz:', error);
            throw error;
        }
    }
}


export const quizEngine = new QuizEngine();
export default quizEngine;
