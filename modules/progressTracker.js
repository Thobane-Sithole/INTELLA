


export const MASTERY_LEVELS = {
    NOVICE: { min: 0, max: 0.2, label: 'Novice', color: '#ef4444', icon: '🌱' },
    BEGINNER: { min: 0.2, max: 0.4, label: 'Beginner', color: '#f97316', icon: '📖' },
    INTERMEDIATE: { min: 0.4, max: 0.6, label: 'Intermediate', color: '#eab308', icon: '⭐' },
    PROFICIENT: { min: 0.6, max: 0.8, label: 'Proficient', color: '#22c55e', icon: '🎯' },
    EXPERT: { min: 0.8, max: 1.0, label: 'Expert', color: '#3b82f6', icon: '🏆' }
};

// BKT Parameters
const BKT_PARAMS = {
    P_L0: 0.1,    
    P_T: 0.3,     
    P_G: 0.2,     // Guess probability
    P_S: 0.1      
};


const STORAGE_KEY = 'intella_progress';

/**
 * Progress Tracker Class
 */
export class ProgressTracker {
    constructor() {
        this.progress = this.loadProgress();
    }

    
    loadProgress() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (e) {
            console.error('Error loading progress:', e);
        }

        return {
            subjects: {},
            topics: {},
            quizHistory: [],
            totalInteractions: 0,
            totalCorrect: 0,
            streakDays: 0,
            lastActiveDate: null,
            achievements: []
        };
    }

    
    saveProgress() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.progress));
        } catch (e) {
            console.error('Error saving progress:', e);
        }
    }

    /**
     * Update topic mastery using BKT
     * @param {string} subject - Subject name
     * @param {string} topic - Topic name
     * @param {boolean} wasCorrect - Whether the interaction was successful
     */
    updateMastery(subject, topic, wasCorrect) {
        const topicKey = `${subject}:${topic}`;

        
        if (!this.progress.topics[topicKey]) {
            this.progress.topics[topicKey] = {
                mastery: BKT_PARAMS.P_L0,
                interactions: 0,
                correct: 0,
                lastInteraction: null
            };
        }

        const topicData = this.progress.topics[topicKey];
        const currentMastery = topicData.mastery;

        
        let newMastery;
        if (wasCorrect) {
            // P(L|correct) using Bayes
            const P_correct_given_L = 1 - BKT_PARAMS.P_S;
            const P_correct_given_not_L = BKT_PARAMS.P_G;
            const P_L_given_correct = (currentMastery * P_correct_given_L) /
                (currentMastery * P_correct_given_L + (1 - currentMastery) * P_correct_given_not_L);

            
            newMastery = P_L_given_correct + (1 - P_L_given_correct) * BKT_PARAMS.P_T;
        } else {
            
            const P_incorrect_given_L = BKT_PARAMS.P_S;
            const P_incorrect_given_not_L = 1 - BKT_PARAMS.P_G;
            const P_L_given_incorrect = (currentMastery * P_incorrect_given_L) /
                (currentMastery * P_incorrect_given_L + (1 - currentMastery) * P_incorrect_given_not_L);

            // Apply learning (slower for incorrect)
            newMastery = P_L_given_incorrect + (1 - P_L_given_incorrect) * (BKT_PARAMS.P_T * 0.5);
        }

        
        topicData.mastery = Math.min(Math.max(newMastery, 0), 1);
        topicData.interactions++;
        if (wasCorrect) topicData.correct++;
        topicData.lastInteraction = new Date().toISOString();

        
        this.updateSubjectMastery(subject);

        // Update totals
        this.progress.totalInteractions++;
        if (wasCorrect) this.progress.totalCorrect++;

        
        this.checkAchievements(subject, topic);

        
        this.saveProgress();

        return {
            previousMastery: currentMastery,
            newMastery: topicData.mastery,
            level: this.getMasteryLevel(topicData.mastery)
        };
    }

    /**
     * Update subject-level mastery (average of topics)
     */
    updateSubjectMastery(subject) {
        const subjectTopics = Object.entries(this.progress.topics)
            .filter(([key]) => key.startsWith(`${subject}:`));

        if (subjectTopics.length === 0) return;

        const avgMastery = subjectTopics.reduce((sum, [, data]) => sum + data.mastery, 0) / subjectTopics.length;

        if (!this.progress.subjects[subject]) {
            this.progress.subjects[subject] = { mastery: 0, topicCount: 0 };
        }

        this.progress.subjects[subject].mastery = avgMastery;
        this.progress.subjects[subject].topicCount = subjectTopics.length;
    }

    
    getMasteryLevel(mastery) {
        for (const [key, level] of Object.entries(MASTERY_LEVELS)) {
            if (mastery >= level.min && mastery < level.max) {
                return { key, ...level };
            }
        }
        return { key: 'EXPERT', ...MASTERY_LEVELS.EXPERT };
    }

    
    getTopicMastery(subject, topic) {
        const topicKey = `${subject}:${topic}`;
        const data = this.progress.topics[topicKey];

        if (!data) {
            return {
                mastery: 0,
                level: this.getMasteryLevel(0),
                interactions: 0
            };
        }

        return {
            mastery: data.mastery,
            level: this.getMasteryLevel(data.mastery),
            interactions: data.interactions,
            accuracy: data.interactions > 0 ? (data.correct / data.interactions) * 100 : 0
        };
    }

    /**
     * Get subject mastery
     */
    getSubjectMastery(subject) {
        const data = this.progress.subjects[subject];

        if (!data) {
            return {
                mastery: 0,
                level: this.getMasteryLevel(0),
                topicCount: 0
            };
        }

        return {
            mastery: data.mastery,
            level: this.getMasteryLevel(data.mastery),
            topicCount: data.topicCount
        };
    }

    
    getWeakAreas(limit = 5) {
        const topics = Object.entries(this.progress.topics)
            .map(([key, data]) => {
                const [subject, topic] = key.split(':');
                return { subject, topic, ...data };
            })
            .filter(t => t.interactions > 0)
            .sort((a, b) => a.mastery - b.mastery)
            .slice(0, limit);

        return topics;
    }

    
    getStrongAreas(limit = 5) {
        const topics = Object.entries(this.progress.topics)
            .map(([key, data]) => {
                const [subject, topic] = key.split(':');
                return { subject, topic, ...data };
            })
            .filter(t => t.interactions > 0)
            .sort((a, b) => b.mastery - a.mastery)
            .slice(0, limit);

        return topics;
    }

    /**
     * Record quiz result
     */
    recordQuiz(subject, questions, score, total) {
        const quiz = {
            subject,
            questions,
            score,
            total,
            percentage: (score / total) * 100,
            date: new Date().toISOString()
        };

        this.progress.quizHistory.push(quiz);

        
        if (this.progress.quizHistory.length > 50) {
            this.progress.quizHistory = this.progress.quizHistory.slice(-50);
        }

        this.saveProgress();
        return quiz;
    }

    
    getOverallStats() {
        const subjectCount = Object.keys(this.progress.subjects).length;
        const topicCount = Object.keys(this.progress.topics).length;

        // Calculate average mastery
        const avgMastery = subjectCount > 0
            ? Object.values(this.progress.subjects).reduce((sum, s) => sum + s.mastery, 0) / subjectCount
            : 0;

        
        const accuracy = this.progress.totalInteractions > 0
            ? (this.progress.totalCorrect / this.progress.totalInteractions) * 100
            : 0;

        return {
            totalInteractions: this.progress.totalInteractions,
            totalCorrect: this.progress.totalCorrect,
            accuracy: accuracy.toFixed(1),
            subjectCount,
            topicCount,
            averageMastery: avgMastery,
            masteryLevel: this.getMasteryLevel(avgMastery),
            quizzesTaken: this.progress.quizHistory.length,
            achievements: this.progress.achievements
        };
    }

    
    checkAchievements(subject, topic) {
        const achievements = [];

        // First interaction
        if (this.progress.totalInteractions === 1) {
            achievements.push({ id: 'first_step', name: 'First Step', icon: '👣', description: 'Started learning!' });
        }

        
        if (this.progress.totalInteractions === 10) {
            achievements.push({ id: 'getting_started', name: 'Getting Started', icon: '🚀', description: '10 interactions!' });
        }

        
        if (this.progress.totalInteractions === 100) {
            achievements.push({ id: 'dedicated', name: 'Dedicated Learner', icon: '📚', description: '100 interactions!' });
        }

        // First expert topic
        const topicKey = `${subject}:${topic}`;
        const topicData = this.progress.topics[topicKey];
        if (topicData && topicData.mastery >= 0.8) {
            const hasExpertAchievement = this.progress.achievements.some(a => a.id === 'first_expert');
            if (!hasExpertAchievement) {
                achievements.push({ id: 'first_expert', name: 'Expert!', icon: '🏆', description: 'Mastered first topic!' });
            }
        }

        
        for (const achievement of achievements) {
            if (!this.progress.achievements.some(a => a.id === achievement.id)) {
                achievement.date = new Date().toISOString();
                this.progress.achievements.push(achievement);
            }
        }

        return achievements;
    }

    
    getProgressSummary() {
        const stats = this.getOverallStats();
        const weakAreas = this.getWeakAreas(3);
        const strongAreas = this.getStrongAreas(3);

        return {
            ...stats,
            weakAreas,
            strongAreas,
            subjects: Object.entries(this.progress.subjects).map(([name, data]) => ({
                name,
                mastery: data.mastery,
                level: this.getMasteryLevel(data.mastery),
                topicCount: data.topicCount
            })).sort((a, b) => b.mastery - a.mastery)
        };
    }

    /**
     * Reset progress
     */
    resetProgress() {
        this.progress = {
            subjects: {},
            topics: {},
            quizHistory: [],
            totalInteractions: 0,
            totalCorrect: 0,
            streakDays: 0,
            lastActiveDate: null,
            achievements: []
        };
        this.saveProgress();
    }
}


export const progressTracker = new ProgressTracker();
export default progressTracker;
