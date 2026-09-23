


import { db } from '../firebase-config.js';
import {
    enableIndexedDbPersistence,
    collection,
    doc,
    setDoc,
    getDoc,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    limit,
    onSnapshot,
    serverTimestamp,
    Timestamp
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';


// Database State

let isOnline = navigator.onLine;
let offlineListeners = [];
let persistenceEnabled = false;



// ===========================================
export async function initDatabase() {
    try {
        
        if (!db) {
            console.error("❌ Firestore not available from firebase-config");
            return { success: false, error: "Firestore not initialized" };
        }

        
        if (!persistenceEnabled) {
            try {
                await enableIndexedDbPersistence(db);
                persistenceEnabled = true;
                console.log("✅ Offline persistence enabled - Data available without internet!");
            } catch (err) {
                if (err.code === 'failed-precondition') {
                    
                    console.warn("⚠️ Offline mode limited - multiple tabs open");
                } else if (err.code === 'unimplemented') {
                    // Browser doesn't support persistence
                    console.warn("⚠️ Browser doesn't support offline mode");
                }
            }
        }

        
        setupOnlineStatusMonitor();

        console.log("✅ Firebase Database initialized");
        return { success: true, db };

    } catch (error) {
        console.error("❌ Database initialization failed:", error);
        return { success: false, error };
    }
}



// ===========================================
function setupOnlineStatusMonitor() {
    window.addEventListener('online', () => {
        isOnline = true;
        console.log("📶 Back online - syncing data...");
        notifyOfflineListeners(true);
    });

    window.addEventListener('offline', () => {
        isOnline = false;
        console.log("📴 Offline - using cached data");
        notifyOfflineListeners(false);
    });
}

export function onOnlineStatusChange(callback) {
    offlineListeners.push(callback);
    
    callback(isOnline);
    return () => {
        offlineListeners = offlineListeners.filter(cb => cb !== callback);
    };
}

function notifyOfflineListeners(online) {
    offlineListeners.forEach(cb => cb(online));
}

export function getOnlineStatus() {
    return isOnline;
}



// ===========================================


export async function saveStudentProfile(studentId, profileData) {
    try {
        const studentRef = doc(db, 'students', studentId);

        const profile = {
            ...profileData,
            updatedAt: serverTimestamp(),
            createdAt: profileData.createdAt || serverTimestamp()
        };

        await setDoc(studentRef, profile, { merge: true });
        console.log("✅ Student profile saved");
        return { success: true, id: studentId };

    } catch (error) {
        console.error("❌ Error saving student profile:", error);
        return { success: false, error };
    }
}


export async function getStudentProfile(studentId) {
    try {
        const studentRef = doc(db, 'students', studentId);
        const docSnap = await getDoc(studentRef);

        if (docSnap.exists()) {
            return { success: true, data: { id: docSnap.id, ...docSnap.data() } };
        } else {
            return { success: false, error: 'Student not found' };
        }

    } catch (error) {
        console.error("❌ Error getting student profile:", error);
        return { success: false, error };
    }
}


export function generateStudentId() {
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substring(2, 8);
    return `student_${timestamp}_${randomPart}`;
}

// ===========================================




export async function saveChatMessage(studentId, message) {
    try {
        const chatRef = collection(db, 'students', studentId, 'chatHistory');

        const chatMessage = {
            role: message.role, // 'user' or 'assistant'
            content: message.content,
            mode: message.mode || 'chat', 
            timestamp: serverTimestamp(),
            localTimestamp: Date.now() 
        };

        const docRef = await addDoc(chatRef, chatMessage);
        return { success: true, id: docRef.id };

    } catch (error) {
        console.error("❌ Error saving chat message:", error);
        return { success: false, error };
    }
}


export async function getChatHistory(studentId, limitCount = 50) {
    try {
        const chatRef = collection(db, 'students', studentId, 'chatHistory');
        const q = query(chatRef, orderBy('localTimestamp', 'desc'), limit(limitCount));

        const querySnapshot = await getDocs(q);
        const messages = [];

        querySnapshot.forEach((doc) => {
            messages.push({ id: doc.id, ...doc.data() });
        });

        // Return in chronological order (oldest first)
        return { success: true, data: messages.reverse() };

    } catch (error) {
        console.error("❌ Error getting chat history:", error);
        return { success: false, error, data: [] };
    }
}


export function subscribeToChatHistory(studentId, callback, limitCount = 50) {
    const chatRef = collection(db, 'students', studentId, 'chatHistory');
    const q = query(chatRef, orderBy('localTimestamp', 'desc'), limit(limitCount));

    return onSnapshot(q, (snapshot) => {
        const messages = [];
        snapshot.forEach((doc) => {
            messages.push({ id: doc.id, ...doc.data() });
        });
        callback(messages.reverse());
    }, (error) => {
        console.error("Chat subscription error:", error);
    });
}


export async function clearChatHistory(studentId) {
    try {
        const chatRef = collection(db, 'students', studentId, 'chatHistory');
        const snapshot = await getDocs(chatRef);

        const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(deletePromises);

        return { success: true };
    } catch (error) {
        console.error("❌ Error clearing chat history:", error);
        return { success: false, error };
    }
}


// PROGRESS TRACKING OPERATIONS



export async function saveProgress(studentId, progressData) {
    try {
        const progressRef = doc(db, 'students', studentId, 'progress', 'current');

        await setDoc(progressRef, {
            ...progressData,
            updatedAt: serverTimestamp()
        }, { merge: true });

        return { success: true };

    } catch (error) {
        console.error("❌ Error saving progress:", error);
        return { success: false, error };
    }
}


export async function getProgress(studentId) {
    try {
        const progressRef = doc(db, 'students', studentId, 'progress', 'current');
        const docSnap = await getDoc(progressRef);

        if (docSnap.exists()) {
            return { success: true, data: docSnap.data() };
        } else {
            return { success: true, data: null };
        }

    } catch (error) {
        console.error("❌ Error getting progress:", error);
        return { success: false, error };
    }
}

/**
 * Save quiz result
 */
export async function saveQuizResult(studentId, quizData) {
    try {
        const quizRef = collection(db, 'students', studentId, 'quizHistory');

        const quiz = {
            subject: quizData.subject,
            topic: quizData.topic,
            score: quizData.score,
            totalQuestions: quizData.totalQuestions,
            percentage: quizData.percentage,
            grade: quizData.grade,
            timestamp: serverTimestamp(),
            localTimestamp: Date.now()
        };

        const docRef = await addDoc(quizRef, quiz);
        return { success: true, id: docRef.id };

    } catch (error) {
        console.error("❌ Error saving quiz result:", error);
        return { success: false, error };
    }
}


export async function getQuizHistory(studentId, limitCount = 20) {
    try {
        const quizRef = collection(db, 'students', studentId, 'quizHistory');
        const q = query(quizRef, orderBy('localTimestamp', 'desc'), limit(limitCount));

        const querySnapshot = await getDocs(q);
        const quizzes = [];

        querySnapshot.forEach((doc) => {
            quizzes.push({ id: doc.id, ...doc.data() });
        });

        return { success: true, data: quizzes };

    } catch (error) {
        console.error("❌ Error getting quiz history:", error);
        return { success: false, error, data: [] };
    }
}



// ===========================================


export async function saveCurriculumData(countryCode, curriculumData) {
    try {
        const curriculumRef = doc(db, 'curriculum', countryCode);

        await setDoc(curriculumRef, {
            ...curriculumData,
            updatedAt: serverTimestamp()
        });

        console.log(`✅ Curriculum saved for ${countryCode}`);
        return { success: true };

    } catch (error) {
        console.error("❌ Error saving curriculum:", error);
        return { success: false, error };
    }
}


export async function getCurriculumData(countryCode) {
    try {
        const curriculumRef = doc(db, 'curriculum', countryCode);
        const docSnap = await getDoc(curriculumRef);

        if (docSnap.exists()) {
            return { success: true, data: docSnap.data() };
        } else {
            return { success: false, error: 'Curriculum not found' };
        }

    } catch (error) {
        console.error("❌ Error getting curriculum:", error);
        return { success: false, error };
    }
}


export async function getAllCurricula() {
    try {
        const curriculumRef = collection(db, 'curriculum');
        const querySnapshot = await getDocs(curriculumRef);

        const curricula = [];
        querySnapshot.forEach((doc) => {
            curricula.push({ code: doc.id, ...doc.data() });
        });

        return { success: true, data: curricula };

    } catch (error) {
        console.error("❌ Error getting curricula:", error);
        return { success: false, error, data: [] };
    }
}

// ===========================================




export const EDUCATION_TYPES = {
    // School Levels
    primary: { name: "Primary School", grades: "1-5", ageRange: "6-11" },
    middle: { name: "Middle School", grades: "6-8", ageRange: "11-14" },
    secondary: { name: "Secondary School", grades: "9-10", ageRange: "14-16" },
    higher_secondary: { name: "Higher Secondary", grades: "11-12", ageRange: "16-18" },

    
    undergraduate: {
        name: "Undergraduate",
        degrees: ["BSc", "BA", "BBA", "BEng", "BTech"],
        years: "4"
    },
    postgraduate: {
        name: "Postgraduate",
        degrees: ["MSc", "MA", "MBA", "MEng", "MTech"],
        years: "2"
    },

    
    cse: { name: "Computer Science & Engineering", department: "Engineering", level: "undergraduate" },
    eee: { name: "Electrical & Electronic Engineering", department: "Engineering", level: "undergraduate" },
    bba: { name: "Business Administration", department: "Business", level: "undergraduate" },
    medical: { name: "Medical (MBBS)", department: "Medicine", level: "undergraduate" },

    
    diploma: { name: "Diploma", years: "3-4" },
    certificate: { name: "Certificate Course", duration: "6-12 months" }
};

/**
 * Academic streams
 */
export const ACADEMIC_STREAMS = {
    science: { name: "Science", subjects: ["Physics", "Chemistry", "Biology", "Mathematics"] },
    commerce: { name: "Commerce", subjects: ["Accounting", "Business Studies", "Economics"] },
    arts: { name: "Arts/Humanities", subjects: ["History", "Geography", "Political Science", "Literature"] },
    engineering: { name: "Engineering", branches: ["CSE", "EEE", "ME", "CE", "ECE"] },
    medical: { name: "Medical", branches: ["MBBS", "BDS", "Nursing", "Pharmacy"] }
};





/**
 * Get local student ID from localStorage
 */
export function getLocalStudentId() {
    let studentId = localStorage.getItem('intella_student_id');
    if (!studentId) {
        studentId = generateStudentId();
        localStorage.setItem('intella_student_id', studentId);
    }
    return studentId;
}


export async function exportStudentData(studentId) {
    try {
        const profile = await getStudentProfile(studentId);
        const chatHistory = await getChatHistory(studentId, 1000);
        const progress = await getProgress(studentId);
        const quizHistory = await getQuizHistory(studentId, 100);

        const exportData = {
            exportDate: new Date().toISOString(),
            studentId,
            profile: profile.data,
            chatHistory: chatHistory.data,
            progress: progress.data,
            quizHistory: quizHistory.data
        };

        return { success: true, data: exportData };

    } catch (error) {
        console.error("❌ Export failed:", error);
        return { success: false, error };
    }
}


export async function importStudentData(studentId, importData) {
    try {
        
        if (importData.profile) {
            await saveStudentProfile(studentId, importData.profile);
        }

        // Save progress
        if (importData.progress) {
            await saveProgress(studentId, importData.progress);
        }

        
        

        console.log("✅ Data imported successfully");
        return { success: true };

    } catch (error) {
        console.error("❌ Import failed:", error);
        return { success: false, error };
    }
}


// DEFAULT EXPORT

export default {
    initDatabase,
    getOnlineStatus,
    onOnlineStatusChange,
    
    saveStudentProfile,
    getStudentProfile,
    generateStudentId,
    getLocalStudentId,
    
    saveChatMessage,
    getChatHistory,
    subscribeToChatHistory,
    clearChatHistory,
    // Progress
    saveProgress,
    getProgress,
    saveQuizResult,
    getQuizHistory,
    
    saveCurriculumData,
    getCurriculumData,
    getAllCurricula,
    
    exportStudentData,
    importStudentData,
    
    EDUCATION_TYPES,
    ACADEMIC_STREAMS
};
