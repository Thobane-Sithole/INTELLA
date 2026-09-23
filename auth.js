// Authentication & Data Management Module for INTELLA
// Handles user auth, profile, progress, chat history

import {
    auth,
    db,
    storage,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signInWithPopup,
    googleProvider,
    onAuthStateChanged,
    signOut,
    sendPasswordResetEmail,
    updateProfile,
    doc,
    setDoc,
    getDoc,
    updateDoc,
    deleteDoc,
    collection,
    addDoc,
    query,
    where,
    orderBy,
    limit,
    getDocs,
    ref,
    uploadBytes,
    getDownloadURL
} from './firebase-config.js';

// Current user state
let currentUser = null;
let userProfile = null;

// ===========================================
// Cached Auth State (for instant UI)
// ===========================================

// Cache keys
const AUTH_CACHE_KEY = 'intella_auth_cache';

// Cache auth state to localStorage for instant UI
function cacheAuthState(user) {
    if (user) {
        const cachedData = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            isLoggedIn: true,
            cachedAt: Date.now()
        };
        localStorage.setItem(AUTH_CACHE_KEY, JSON.stringify(cachedData));
    } else {
        localStorage.removeItem(AUTH_CACHE_KEY);
    }
}

// Get cached auth state
export function getCachedAuthState() {
    try {
        const cached = localStorage.getItem(AUTH_CACHE_KEY);
        if (cached) {
            const data = JSON.parse(cached);
            // Cache is valid for 7 days
            if (Date.now() - data.cachedAt < 7 * 24 * 60 * 60 * 1000) {
                return data;
            }
        }
    } catch (e) {
        console.error("Error reading auth cache:", e);
    }
    return null;
}

// Update header UI based on auth state (instant, no waiting)
export function updateHeaderAuthUI(authState) {
    const userBtn = document.getElementById('user-btn');
    const userBtnText = document.getElementById('user-btn-text');
    const userBtnIcon = document.getElementById('user-btn-icon');
    const userBtnAvatar = document.getElementById('user-btn-avatar');

    if (authState && authState.isLoggedIn) {
        // User is logged in - show profile picture
        if (userBtn) userBtn.classList.add('logged-in');
        if (userBtnText) userBtnText.textContent = '';

        if (authState.photoURL && userBtnAvatar) {
            userBtnAvatar.src = authState.photoURL;
            userBtnAvatar.classList.remove('hidden');
            if (userBtnIcon) userBtnIcon.classList.add('hidden');
        } else {
            // Show first letter of name or email as avatar
            if (userBtnIcon) {
                const initial = (authState.displayName || authState.email || '').charAt(0).toUpperCase() || '👤';
                userBtnIcon.textContent = initial;
                userBtnIcon.classList.remove('hidden');
                userBtnIcon.style.fontSize = '1rem';
                userBtnIcon.style.fontWeight = '600';
            }
            if (userBtnAvatar) userBtnAvatar.classList.add('hidden');
        }
    } else {
        // User not logged in - show login
        if (userBtn) userBtn.classList.remove('logged-in');
        if (userBtnText) userBtnText.textContent = 'Login';
        if (userBtnIcon) {
            userBtnIcon.textContent = '👤';
            userBtnIcon.classList.remove('hidden');
            userBtnIcon.style.fontSize = '';
            userBtnIcon.style.fontWeight = '';
        }
        if (userBtnAvatar) userBtnAvatar.classList.add('hidden');
    }
}

// ===========================================
// Authentication Functions
// ===========================================

// Initialize auth state listener
export function initAuth() {
    // First, instantly update UI from cache (no loading delay)
    const cachedAuth = getCachedAuthState();
    if (cachedAuth) {
        console.log("⚡ Using cached auth state for instant UI");
        updateHeaderAuthUI(cachedAuth);
    }

    return new Promise((resolve) => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                console.log("✅ User signed in:", user.email);
                currentUser = user;

                // Cache the auth state for next page load
                cacheAuthState(user);

                // Update header UI with real data
                updateHeaderAuthUI({
                    isLoggedIn: true,
                    displayName: user.displayName,
                    email: user.email,
                    photoURL: user.photoURL
                });

                await loadUserProfile(user.uid);

                // Update credits and BKT progress display
                if (typeof window.updateCreditsDisplay === 'function') {
                    await window.updateCreditsDisplay();
                }
                // Don't show profile UI here - let app.js handle it after student profile loads
            } else {
                console.log("❌ No user signed in");
                currentUser = null;
                userProfile = null;

                // Clear cache and update UI
                cacheAuthState(null);
                updateHeaderAuthUI(null);

                // Update credits display to show 0 for guest
                if (typeof window.updateCreditsDisplay === 'function') {
                    await window.updateCreditsDisplay();
                }
            }
            // Resolve the promise after first auth state check
            resolve(user);
        });
    });
}

// Email/Password Login
export async function loginWithEmail(email, password) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        console.log("✅ Login successful");
        return { success: true, user: userCredential.user };
    } catch (error) {
        console.error("❌ Login error:", error);
        return { success: false, error: error.message };
    }
}

// Email/Password Signup
export async function signupWithEmail(email, password, displayName, grade) {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Create user profile
        await createUserProfile(user.uid, {
            email: user.email,
            displayName: displayName,
            grade: parseInt(grade),
            createdAt: new Date(),
            lastActive: new Date(),
            totalPoints: 0,
            streak: 0,
            subjects: []
        });

        console.log("✅ Signup successful");
        return { success: true, user };
    } catch (error) {
        console.error("❌ Signup error:", error);
        return { success: false, error: error.message };
    }
}

// Google Sign-in
export async function loginWithGoogle() {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;

        // Check if profile exists, if not create one
        const profileExists = await getDoc(doc(db, "users", user.uid));
        if (!profileExists.exists()) {
            await createUserProfile(user.uid, {
                email: user.email,
                displayName: user.displayName || "Student",
                grade: 10, // Default grade
                createdAt: new Date(),
                lastActive: new Date(),
                totalPoints: 0,
                streak: 0,
                subjects: []
            });
        }

        console.log("✅ Google login successful");
        return { success: true, user };
    } catch (error) {
        console.error("❌ Google login error:", error);
        return { success: false, error: error.message };
    }
}

// Logout
export async function logout() {
    try {
        await signOut(auth);
        currentUser = null;
        userProfile = null;
        console.log("✅ Logout successful");
        return { success: true };
    } catch (error) {
        console.error("❌ Logout error:", error);
        return { success: false, error: error.message };
    }
}

// Password Reset
export async function resetPassword(email) {
    try {
        await sendPasswordResetEmail(auth, email);
        console.log("✅ Password reset email sent");
        return { success: true, message: "Password reset email sent! Check your inbox." };
    } catch (error) {
        console.error("❌ Password reset error:", error);
        return { success: false, error: error.message };
    }
}

// Upload Profile Picture
export async function uploadProfilePicture(file) {
    if (!currentUser) return { success: false, error: "Not logged in" };

    try {
        // Create storage reference
        const storageRef = ref(storage, `profile-pictures/${currentUser.uid}`);

        // Upload file
        await uploadBytes(storageRef, file);

        // Get download URL
        const photoURL = await getDownloadURL(storageRef);

        // Update auth profile
        await updateProfile(currentUser, { photoURL });

        // Update Firestore profile
        await updateDoc(doc(db, "users", currentUser.uid), { photoURL });

        console.log("✅ Profile picture uploaded");
        return { success: true, photoURL };
    } catch (error) {
        console.error("❌ Profile picture upload error:", error);
        return { success: false, error: error.message };
    }
}

// Update Display Name
export async function updateDisplayName(displayName) {
    if (!currentUser) return { success: false, error: "Not logged in" };

    try {
        await updateProfile(currentUser, { displayName });
        await updateDoc(doc(db, "users", currentUser.uid), { displayName });
        console.log("✅ Display name updated");
        return { success: true };
    } catch (error) {
        console.error("❌ Display name update error:", error);
        return { success: false, error: error.message };
    }
}

// ===========================================
// User Profile Functions
// ===========================================

// Create user profile
async function createUserProfile(userId, profileData) {
    await setDoc(doc(db, "users", userId), profileData);
}

// Load user profile
async function loadUserProfile(userId) {
    try {
        const docSnap = await getDoc(doc(db, "users", userId));
        if (docSnap.exists()) {
            userProfile = { id: userId, ...docSnap.data() };

            // Update last active
            await updateDoc(doc(db, "users", userId), {
                lastActive: new Date()
            });

            return userProfile;
        }
    } catch (error) {
        console.error("❌ Error loading profile:", error);
    }
    return null;
}

// Get current user
export function getCurrentUser() {
    return currentUser;
}

// Get user profile
export function getUserProfile() {
    return userProfile;
}

// Update user profile
export async function updateUserProfile(updates) {
    if (!currentUser) return { success: false, error: "Not logged in" };

    try {
        await updateDoc(doc(db, "users", currentUser.uid), updates);
        userProfile = { ...userProfile, ...updates };
        console.log("✅ Profile updated");
        return { success: true };
    } catch (error) {
        console.error("❌ Profile update error:", error);
        return { success: false, error: error.message };
    }
}

// ===========================================
// Progress Tracking Functions
// ===========================================

// Save topic progress (BKT knowledge level)
export async function saveProgress(subject, topic, knowledgeLevel, attempts) {
    if (!currentUser) return { success: false, error: "Not logged in" };

    // Validate inputs to prevent undefined values
    if (!subject || !topic) {
        console.warn("⚠️ Invalid progress data: missing subject or topic");
        return { success: false, error: "Missing subject or topic" };
    }

    // Ensure values are not undefined
    const safeKnowledgeLevel = knowledgeLevel ?? 0;
    const safeAttempts = attempts ?? 0;

    // Sanitize subject and topic for document ID (remove special characters)
    const safeSubject = String(subject).replace(/[\/\.\#\$\[\]]/g, '_');
    const safeTopic = String(topic).replace(/[\/\.\#\$\[\]]/g, '_');
    const progressId = `${currentUser.uid}_${safeSubject}_${safeTopic}`;

    try {
        await setDoc(doc(db, "progress", progressId), {
            userId: currentUser.uid,
            subject: safeSubject,
            topic: safeTopic,
            knowledgeLevel: safeKnowledgeLevel,
            attempts: safeAttempts,
            lastPracticed: new Date(),
            updatedAt: new Date()
        });

        console.log("✅ Progress saved:", safeSubject, safeTopic);
        return { success: true };
    } catch (error) {
        console.error("❌ Progress save error:", error);
        return { success: false, error: error.message };
    }
}

// Save overall learning state (achievements, streaks, points, level)
export async function saveLearningState(progressTracker) {
    if (!currentUser) return { success: false, error: "Not logged in" };

    try {
        // Sanitize data to remove undefined values
        const cleanData = {
            userId: currentUser.uid,
            totalPoints: progressTracker.totalPoints ?? 0,
            level: progressTracker.level ?? 1,
            streakData: {
                currentStreak: progressTracker.streakData?.currentStreak ?? 0,
                longestStreak: progressTracker.streakData?.longestStreak ?? 0,
                lastActiveDate: progressTracker.streakData?.lastActiveDate ?? new Date().toISOString().split('T')[0]
            },
            achievements: Array.isArray(progressTracker.achievements)
                ? progressTracker.achievements.filter(a => a !== undefined)
                : [],
            updatedAt: new Date()
        };

        await setDoc(doc(db, "learningState", currentUser.uid), cleanData);
        console.log("✅ Learning state saved");
        return { success: true };
    } catch (error) {
        console.error("❌ Learning state save error:", error);
        return { success: false, error: error.message };
    }
}

// Load learning state
export async function loadLearningState() {
    if (!currentUser) return null;

    try {
        const docSnap = await getDoc(doc(db, "learningState", currentUser.uid));
        if (docSnap.exists()) {
            console.log("✅ Learning state loaded");
            return docSnap.data();
        }
        return null;
    } catch (error) {
        console.error("❌ Learning state load error:", error);
        return null;
    }
}

// Load all progress for user
export async function loadProgress() {
    if (!currentUser) return [];

    try {
        const q = query(
            collection(db, "progress"),
            where("userId", "==", currentUser.uid)
        );
        const querySnapshot = await getDocs(q);

        const progressData = [];
        querySnapshot.forEach((doc) => {
            progressData.push({ id: doc.id, ...doc.data() });
        });

        console.log("✅ Loaded", progressData.length, "progress records");
        return progressData;
    } catch (error) {
        console.error("❌ Progress load error:", error);
        return [];
    }
}

// ===========================================
// Chat History Functions (Professional like Claude/ChatGPT)
// ===========================================

// Current active chat session ID
let currentChatId = null;

// Get current chat ID
export function getCurrentChatId() {
    return currentChatId;
}

// Set current chat ID
export function setCurrentChatId(chatId) {
    currentChatId = chatId;
}

// Generate smart chat title from conversation
function generateChatTitle(messages) {
    if (!messages || messages.length === 0) {
        console.log("📝 Title: No messages");
        return 'New Chat';
    }

    // Find first user message
    const firstUserMsg = messages.find(msg => msg.role === 'user');
    if (!firstUserMsg) {
        console.log("📝 Title: No user message found");
        return 'New Chat';
    }

    // Get text from message - check multiple formats
    let text = '';
    if (firstUserMsg.content && typeof firstUserMsg.content === 'string') {
        text = firstUserMsg.content;
    } else if (firstUserMsg.parts && Array.isArray(firstUserMsg.parts)) {
        text = firstUserMsg.parts.map(p => p.text || '').join(' ');
    } else if (firstUserMsg.text) {
        text = firstUserMsg.text;
    }

    console.log("📝 Title source text:", text.substring(0, 100));

    // Clean text
    text = text.trim().replace(/\n/g, ' ').replace(/\s+/g, ' ');

    if (!text) {
        console.log("📝 Title: Empty text after cleaning");
        return 'New Chat';
    }

    // Smart title extraction - try to get the main topic/question
    // Remove common question starters to get the topic
    let title = text
        .replace(/^(hi|hello|hey|please|can you|could you|would you|will you|i want to|i need to|help me|teach me|explain|tell me about|tell me|what is|what are|what's|how to|how do|how does|why is|why are|why do|when is|when are|where is|where are|who is|who are|i have a question about|question about)\s*/gi, '')
        .trim();

    // If title became empty after removing starters, use original text
    if (!title) {
        title = text;
    }

    // Capitalize first letter
    if (title.length > 0) {
        title = title.charAt(0).toUpperCase() + title.slice(1);
    }

    // Truncate if too long
    if (title.length > 50) {
        // Try to cut at a word boundary
        const cutoff = title.lastIndexOf(' ', 47);
        title = title.substring(0, cutoff > 20 ? cutoff : 47) + '...';
    }

    console.log("📝 Generated title:", title);
    return title || 'New Chat';
}

// Save new chat session
export async function saveChatHistory(mode, messages) {
    if (!currentUser) return { success: false, error: "Not logged in" };

    // Validate and clean messages
    if (!Array.isArray(messages) || messages.length === 0) {
        console.warn("⚠️ No valid messages to save");
        return { success: false, error: "No messages to save" };
    }

    // Require at least 2 messages (1 user + 1 reply) for a real conversation
    const hasUserMsg = messages.some(m => m.role === 'user');
    const hasModelMsg = messages.some(m => m.role === 'model');
    if (!hasUserMsg || !hasModelMsg) {
        console.warn("⚠️ Need both user and model messages to save");
        return { success: false, error: "Need conversation to save" };
    }

    // Filter and sanitize messages (keep image, quiz, and other data)
    const cleanedMessages = messages
        .filter(msg => msg && (msg.role || msg.parts || msg.content))
        .map(msg => ({
            role: msg.role || 'user',
            content: msg.content || '',
            type: msg.type || 'text', // 'text', 'image', 'file', 'quiz', 'quiz_result'
            imageData: msg.imageData || null, // base64 image data
            mimeType: msg.mimeType || null, // image mime type
            fileName: msg.fileName || null, // uploaded file name
            quizData: msg.quizData || null, // quiz questions data
            quizResult: msg.quizResult || null, // quiz result data
            parts: Array.isArray(msg.parts)
                ? msg.parts.map(part => ({
                    text: part.text ?? ''
                }))
                : [{ text: msg.content || '' }],
            timestamp: msg.timestamp || new Date().toISOString()
        }));

    if (cleanedMessages.length === 0) {
        console.warn("⚠️ No valid messages after cleaning");
        return { success: false, error: "No valid messages" };
    }

    try {
        const title = generateChatTitle(cleanedMessages);
        const chatRef = await addDoc(collection(db, "chatHistory"), {
            userId: currentUser.uid,
            title: title,
            mode: mode || 'chat',
            messages: cleanedMessages,
            messageCount: cleanedMessages.length,
            createdAt: new Date(),
            updatedAt: new Date()
        });

        currentChatId = chatRef.id;
        console.log("✅ Chat history saved:", chatRef.id, "Title:", title);
        return { success: true, chatId: chatRef.id, title: title };
    } catch (error) {
        console.error("❌ Chat save error:", error);
        return { success: false, error: error.message };
    }
}

// Update existing chat session (add new messages)
export async function updateChatHistory(chatId, messages) {
    if (!currentUser) return { success: false, error: "Not logged in" };
    if (!chatId) return { success: false, error: "No chat ID" };

    // Clean messages (keep image, quiz, and other data)
    const cleanedMessages = messages
        .filter(msg => msg && (msg.role || msg.parts || msg.content))
        .map(msg => ({
            role: msg.role || 'user',
            content: msg.content || '',
            type: msg.type || 'text',
            imageData: msg.imageData || null,
            mimeType: msg.mimeType || null,
            fileName: msg.fileName || null,
            quizData: msg.quizData || null,
            quizResult: msg.quizResult || null,
            parts: Array.isArray(msg.parts)
                ? msg.parts.map(part => ({
                    text: part.text ?? ''
                }))
                : [{ text: msg.content || '' }],
            timestamp: msg.timestamp || new Date().toISOString()
        }));

    try {
        const chatRef = doc(db, "chatHistory", chatId);
        await updateDoc(chatRef, {
            messages: cleanedMessages,
            messageCount: cleanedMessages.length,
            updatedAt: new Date()
        });

        console.log("✅ Chat updated:", chatId);
        return { success: true, chatId: chatId };
    } catch (error) {
        console.error("❌ Chat update error:", error);
        return { success: false, error: error.message };
    }
}

// Load recent chat history list (for sidebar) - with offline cache
export async function loadChatHistory(limitCount = 50) {
    const CACHE_KEY = 'intella_chat_history_cache';

    // Try to load from cache first (for immediate display)
    let cachedChats = [];
    try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
            cachedChats = JSON.parse(cached);
            console.log("📦 Loaded", cachedChats.length, "chats from cache");
        }
    } catch (e) {
        console.warn("Cache read error:", e);
    }

    // If not logged in, return cached data
    if (!currentUser) {
        console.log("👤 No user, returning cached chats");
        return cachedChats;
    }

    // Check if online
    if (!navigator.onLine) {
        console.log("📴 Offline - using cached chat history");
        return cachedChats;
    }

    try {
        // Query chats ordered by createdAt (no composite index needed)
        // We filter by userId and sort by creation time
        const q = query(
            collection(db, "chatHistory"),
            where("userId", "==", currentUser.uid),
            orderBy("createdAt", "desc"),
            limit(limitCount)
        );
        const querySnapshot = await getDocs(q);

        const chats = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            chats.push({
                id: doc.id,
                title: data.title || 'Untitled Chat',
                mode: data.mode || 'chat',
                messageCount: data.messageCount || data.messages?.length || 0,
                createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
                updatedAt: data.updatedAt?.toDate?.() || new Date(data.updatedAt)
            });
        });

        console.log("✅ Loaded", chats.length, "chat sessions from Firebase");

        // Cache to localStorage for offline access
        try {
            localStorage.setItem(CACHE_KEY, JSON.stringify(chats));
            console.log("💾 Chat history cached for offline");
        } catch (e) {
            console.warn("Cache write error:", e);
        }

        return chats;
    } catch (error) {
        console.error("❌ Chat load error:", error);
        // Return cached data on error
        console.log("📦 Returning cached chats due to error");
        return cachedChats;
    }
}

// Load single chat with full messages - with offline cache
export async function loadChat(chatId) {
    const CACHE_KEY = `intella_chat_${chatId}`;

    // Try to load from cache first
    let cachedChat = null;
    try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
            cachedChat = JSON.parse(cached);
            console.log("📦 Loaded chat from cache:", chatId);
        }
    } catch (e) {
        console.warn("Cache read error:", e);
    }

    if (!currentUser) {
        return cachedChat;
    }
    if (!chatId) return null;

    // Check if online
    if (!navigator.onLine) {
        console.log("📴 Offline - using cached chat");
        return cachedChat;
    }

    try {
        const chatRef = doc(db, "chatHistory", chatId);
        const chatSnap = await getDoc(chatRef);

        if (chatSnap.exists()) {
            const data = chatSnap.data();

            // Verify ownership
            if (data.userId !== currentUser.uid) {
                console.error("❌ Unauthorized access to chat");
                return null;
            }

            const chat = {
                id: chatSnap.id,
                ...data,
                createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
                updatedAt: data.updatedAt?.toDate?.() || new Date(data.updatedAt)
            };

            console.log("✅ Loaded chat from Firebase:", chatId);

            // Cache for offline access
            try {
                localStorage.setItem(CACHE_KEY, JSON.stringify(chat));
                console.log("💾 Chat cached for offline:", chatId);
            } catch (e) {
                console.warn("Cache write error:", e);
            }

            return chat;
        } else {
            console.warn("⚠️ Chat not found:", chatId);
            return cachedChat; // Return cached if available
        }
    } catch (error) {
        console.error("❌ Chat load error:", error);
        // Return cached data on error
        return cachedChat;
    }
}

// Delete chat
export async function deleteChat(chatId) {
    if (!currentUser) return { success: false, error: "Not logged in" };
    if (!chatId) return { success: false, error: "No chat ID" };

    try {
        // First verify ownership
        const chatRef = doc(db, "chatHistory", chatId);
        const chatSnap = await getDoc(chatRef);

        if (!chatSnap.exists()) {
            return { success: false, error: "Chat not found" };
        }

        if (chatSnap.data().userId !== currentUser.uid) {
            return { success: false, error: "Unauthorized" };
        }

        // Delete using imported deleteDoc
        await deleteDoc(chatRef);

        // Clear current chat if it was deleted
        if (currentChatId === chatId) {
            currentChatId = null;
        }

        console.log("✅ Chat deleted:", chatId);
        return { success: true };
    } catch (error) {
        console.error("❌ Chat delete error:", error);
        return { success: false, error: error.message };
    }
}

// Rename chat
export async function renameChat(chatId, newTitle) {
    if (!currentUser) return { success: false, error: "Not logged in" };
    if (!chatId) return { success: false, error: "No chat ID" };

    try {
        const chatRef = doc(db, "chatHistory", chatId);
        await updateDoc(chatRef, {
            title: newTitle,
            updatedAt: new Date()
        });

        console.log("✅ Chat renamed:", chatId, "to", newTitle);
        return { success: true };
    } catch (error) {
        console.error("❌ Chat rename error:", error);
        return { success: false, error: error.message };
    }
}

// ===========================================
// Quiz Results Functions
// ===========================================

// Save quiz result
export async function saveQuizResult(subject, topic, score, totalQuestions, timeTaken, answers) {
    if (!currentUser) return { success: false, error: "Not logged in" };

    try {
        await addDoc(collection(db, "quizResults"), {
            userId: currentUser.uid,
            subject,
            topic,
            score,
            totalQuestions,
            timeTaken,
            answers,
            completedAt: new Date()
        });

        // Update user points
        const newPoints = userProfile.totalPoints + score;
        await updateUserProfile({ totalPoints: newPoints });

        console.log("✅ Quiz result saved");
        return { success: true };
    } catch (error) {
        console.error("❌ Quiz save error:", error);
        return { success: false, error: error.message };
    }
}

// ===========================================
// Student Profile Functions (Educational Data)
// ===========================================

// Save student educational profile to Firestore
export async function saveStudentProfileToFirestore(profileData) {
    if (!currentUser) {
        console.warn("⚠️ No user logged in, cannot save to Firestore");
        return { success: false, error: "Not logged in" };
    }

    try {
        // Build clean profile - only include relevant fields based on type
        const isUniversity = profileData.type === 'university' ||
            profileData.educationLevel === 'undergraduate' ||
            profileData.educationLevel === 'postgraduate' ||
            profileData.educationLevel === 'doctoral';

        const cleanProfile = {
            id: profileData.id,
            userId: currentUser.uid,
            email: currentUser.email,
            displayName: profileData.displayName,
            country: profileData.country,
            countryName: profileData.countryName,
            educationLevel: profileData.educationLevel,
            type: isUniversity ? 'university' : 'school',
            language: profileData.language || 'en-US',
            subjects: profileData.subjects || [],
            createdAt: profileData.createdAt,
            updatedAt: new Date()
        };

        // Add type-specific fields only
        if (isUniversity) {
            cleanProfile.department = profileData.department;
            cleanProfile.program = profileData.program;
            cleanProfile.programName = profileData.programName;
            cleanProfile.year = profileData.year;
            // Explicitly NOT including: board, class, stream
        } else {
            cleanProfile.board = profileData.board;
            cleanProfile.class = profileData.class;
            cleanProfile.stream = profileData.stream;
            // Explicitly NOT including: department, program, programName, year
        }

        console.log("📝 Saving clean profile to Firestore:", cleanProfile);

        // setDoc without merge option replaces the entire document
        await setDoc(doc(db, "studentProfiles", currentUser.uid), cleanProfile);

        console.log("✅ Student profile saved to Firestore:", currentUser.uid);
        return { success: true };
    } catch (error) {
        console.error("❌ Student profile save error:", error);
        return { success: false, error: error.message };
    }
}

// Load student educational profile from Firestore
export async function loadStudentProfileFromFirestore() {
    if (!currentUser) {
        return { success: false, error: "Not logged in", data: null };
    }

    try {
        const docSnap = await getDoc(doc(db, "studentProfiles", currentUser.uid));

        if (docSnap.exists()) {
            const profileData = docSnap.data();
            console.log("✅ Student profile loaded from Firestore:", currentUser.uid);
            return { success: true, data: profileData };
        } else {
            console.log("📝 No student profile found in Firestore for:", currentUser.uid);
            return { success: true, data: null };
        }
    } catch (error) {
        console.error("❌ Student profile load error:", error);
        return { success: false, error: error.message, data: null };
    }
}

// ===========================================
// UI Helper Functions
// ===========================================

export function showLoginForm() {
    // Update header to show login state
    updateHeaderAuthUI(null);
}

export function showUserProfile() {
    const authModal = document.getElementById('auth-modal');
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const userProfileDiv = document.getElementById('user-profile');
    const userBtn = document.getElementById('user-btn');

    // Show auth modal with profile
    if (authModal) authModal.classList.remove('hidden');

    if (loginForm) loginForm.classList.add('hidden');
    if (signupForm) signupForm.classList.add('hidden');

    // Get student profile from localStorage
    let studentProfile = null;
    try {
        const savedProfile = localStorage.getItem('intella_student_profile');
        if (savedProfile) {
            studentProfile = JSON.parse(savedProfile);
        }
    } catch (e) {
        console.error("Error loading student profile:", e);
    }

    if (currentUser && userProfileDiv) {
        const profileName = document.getElementById('profile-name');
        const profileEmail = document.getElementById('profile-email');
        const profileGrade = document.getElementById('profile-grade');
        const profileAvatarImg = document.getElementById('profile-avatar-img');
        const profileAvatarText = document.getElementById('profile-avatar-text');

        // Set name (from auth or student profile)
        const displayName = currentUser.displayName || studentProfile?.displayName || userProfile?.displayName || 'Student';
        if (profileName) profileName.textContent = displayName;
        if (profileEmail) profileEmail.textContent = currentUser.email || '';

        // Set grade/education info from student profile
        if (profileGrade && studentProfile) {
            const isUniversity = studentProfile.type === 'university' ||
                studentProfile.educationLevel === 'undergraduate' ||
                studentProfile.educationLevel === 'postgraduate' ||
                studentProfile.educationLevel === 'doctoral';

            if (isUniversity) {
                // Show program code (CSE, EEE, etc.) or department name
                const programDisplay = studentProfile.programName ||
                    (studentProfile.program ? studentProfile.program.toUpperCase() : '') ||
                    studentProfile.department ||
                    'University';
                profileGrade.textContent = `${programDisplay} - Year ${studentProfile.year || 1}`;
            } else {
                profileGrade.textContent = `Class ${studentProfile.class || 10} - ${(studentProfile.stream || 'Science').charAt(0).toUpperCase() + (studentProfile.stream || 'science').slice(1)}`;
            }
        }

        // Handle profile picture
        if (currentUser.photoURL && profileAvatarImg) {
            profileAvatarImg.src = currentUser.photoURL;
            profileAvatarImg.style.display = 'block';
            if (profileAvatarText) profileAvatarText.style.display = 'none';
        } else {
            if (profileAvatarImg) profileAvatarImg.style.display = 'none';
            if (profileAvatarText) {
                profileAvatarText.style.display = 'block';
                profileAvatarText.textContent = displayName ? displayName.charAt(0).toUpperCase() : '👤';
            }
        }

        // Set stats
        const totalPoints = userProfile?.totalPoints || studentProfile?.totalPoints || 0;
        const streak = userProfile?.streak || studentProfile?.streak || 0;
        const topicsCount = userProfile?.subjects?.length || studentProfile?.subjects?.length || 0;

        const profilePoints = document.getElementById('profile-points');
        const profileStreak = document.getElementById('profile-streak');
        const profileTopics = document.getElementById('profile-topics');

        if (profilePoints) profilePoints.textContent = totalPoints;
        if (profileStreak) profileStreak.textContent = streak;
        if (profileTopics) profileTopics.textContent = topicsCount;

        // Show/hide buttons based on login state
        const linkAccountBtn = document.getElementById('link-account-btn');
        const logoutBtn = document.getElementById('logout-btn');
        const changePhotoBtn = document.getElementById('change-profile-pic-btn');

        if (linkAccountBtn) linkAccountBtn.classList.add('hidden'); // Hide link account for logged in users
        if (logoutBtn) logoutBtn.classList.remove('hidden');
        if (changePhotoBtn) changePhotoBtn.classList.remove('hidden');

        userProfileDiv.classList.remove('hidden');
    } else if (!currentUser) {
        // Not logged in but might have local profile
        if (studentProfile && userProfileDiv) {
            const profileName = document.getElementById('profile-name');
            const profileEmail = document.getElementById('profile-email');
            const profileGrade = document.getElementById('profile-grade');
            const profileAvatarText = document.getElementById('profile-avatar-text');
            const profileAvatarImg = document.getElementById('profile-avatar-img');

            if (profileName) profileName.textContent = studentProfile.displayName || 'Student';
            if (profileEmail) profileEmail.textContent = studentProfile.email || 'Local profile (not synced)';

            if (profileGrade) {
                const isUniversity = studentProfile.type === 'university' ||
                    studentProfile.educationLevel === 'undergraduate' ||
                    studentProfile.educationLevel === 'postgraduate' ||
                    studentProfile.educationLevel === 'doctoral';

                if (isUniversity) {
                    const programDisplay = studentProfile.programName ||
                        (studentProfile.program ? studentProfile.program.toUpperCase() : '') ||
                        studentProfile.department ||
                        'University';
                    profileGrade.textContent = `${programDisplay} - Year ${studentProfile.year || 1}`;
                } else {
                    profileGrade.textContent = `Class ${studentProfile.class || 10} - ${(studentProfile.stream || 'Science').charAt(0).toUpperCase() + (studentProfile.stream || 'science').slice(1)}`;
                }
            }

            if (profileAvatarImg) profileAvatarImg.style.display = 'none';
            if (profileAvatarText) {
                profileAvatarText.style.display = 'block';
                profileAvatarText.textContent = studentProfile.displayName ? studentProfile.displayName.charAt(0).toUpperCase() : '👤';
            }

            // Show/hide buttons for local-only users
            const linkAccountBtn = document.getElementById('link-account-btn');
            const logoutBtn = document.getElementById('logout-btn');
            const changePhotoBtn = document.getElementById('change-profile-pic-btn');

            if (linkAccountBtn) linkAccountBtn.classList.remove('hidden'); // Show link account for local users
            if (logoutBtn) {
                logoutBtn.textContent = 'Clear Profile';
                logoutBtn.classList.remove('hidden');
            }
            if (changePhotoBtn) changePhotoBtn.classList.add('hidden'); // Can't upload without account

            // Set stats
            const profilePoints = document.getElementById('profile-points');
            const profileStreak = document.getElementById('profile-streak');
            const profileTopics = document.getElementById('profile-topics');

            if (profilePoints) profilePoints.textContent = studentProfile.totalPoints || 0;
            if (profileStreak) profileStreak.textContent = studentProfile.streak || 0;
            if (profileTopics) profileTopics.textContent = studentProfile.subjects?.length || 0;

            userProfileDiv.classList.remove('hidden');
        }
    }

    if (userBtn) userBtn.textContent = currentUser?.displayName?.split(' ')[0] || userProfile?.displayName?.split(' ')[0] || 'Profile';
}

console.log("✅ Auth module loaded");

// ===========================================
// Textbook Library Functions
// ===========================================

// Get textbooks for a specific class/stream
export async function getTextbooks(filters = {}) {
    try {
        const textbooksRef = collection(db, 'textbooks');
        let q;

        // Build query based on filters
        if (filters.department && filters.program) {
            // University query
            q = query(textbooksRef,
                where('type', '==', 'university'),
                where('department', '==', filters.department),
                where('program', '==', filters.program)
            );
        } else if (filters.classNum && filters.stream) {
            // School query with stream
            q = query(textbooksRef,
                where('class', '==', parseInt(filters.classNum)),
                where('stream', 'in', [filters.stream, '', null])
            );
        } else if (filters.classNum) {
            // School query without stream
            q = query(textbooksRef, where('class', '==', parseInt(filters.classNum)));
        } else {
            // Get all (limited)
            q = query(textbooksRef, limit(50));
        }

        const snapshot = await getDocs(q);
        const textbooks = [];
        snapshot.forEach(doc => {
            textbooks.push({ id: doc.id, ...doc.data() });
        });

        return textbooks;
    } catch (error) {
        console.error("Error getting textbooks:", error);
        return [];
    }
}

// Check if textbook already exists
export async function checkTextbookExists(classNum, subject, board = 'NCTB') {
    try {
        const textbooksRef = collection(db, 'textbooks');
        const q = query(textbooksRef,
            where('class', '==', parseInt(classNum)),
            where('subject', '==', subject.toLowerCase()),
            where('board', '==', board)
        );

        const snapshot = await getDocs(q);
        return !snapshot.empty;
    } catch (error) {
        console.error("Error checking textbook:", error);
        return false;
    }
}

// Check if university textbook already exists
export async function checkUniversityTextbookExists(department, program, subject) {
    try {
        const textbooksRef = collection(db, 'textbooks');
        const q = query(textbooksRef,
            where('type', '==', 'university'),
            where('department', '==', department),
            where('program', '==', program),
            where('subject', '==', subject.toLowerCase())
        );

        const snapshot = await getDocs(q);
        return !snapshot.empty;
    } catch (error) {
        console.error("Error checking university textbook:", error);
        return false;
    }
}

// Upload textbook to Firebase Storage and create Firestore entry
export async function uploadTextbook(file, metadata, onProgress) {
    try {
        const user = currentUser;
        const isUniversity = metadata.type === 'university';

        // Different file path for university vs school
        const fileName = isUniversity
            ? `textbooks/university/${metadata.department}/${metadata.program}/${metadata.subject}-${Date.now()}.pdf`
            : `textbooks/class-${metadata.class}/${metadata.subject}-${Date.now()}.pdf`;

        const storageRef = ref(storage, fileName);

        // Upload file
        const uploadTask = await uploadBytes(storageRef, file);

        // Get download URL
        const downloadUrl = await getDownloadURL(storageRef);

        // Create Firestore document - different structure for university
        let textbookData;

        if (isUniversity) {
            textbookData = {
                title: metadata.title,
                subject: metadata.subject.toLowerCase(),
                type: 'university',
                department: metadata.department,
                program: metadata.program,
                country: metadata.country || 'bangladesh',
                fileName: file.name,
                fileSize: file.size,
                pdfUrl: downloadUrl,
                storagePath: fileName,
                uploadedBy: user?.uid || 'anonymous',
                uploadedAt: new Date().toISOString(),
                verified: false,
                chaptersCount: 0,
                chaptersExtracted: false
            };
        } else {
            textbookData = {
                title: metadata.title,
                subject: metadata.subject.toLowerCase(),
                class: parseInt(metadata.class),
                stream: metadata.stream || '',
                board: metadata.board || 'NCTB',
                country: metadata.country || 'bangladesh',
                fileName: file.name,
                fileSize: file.size,
                pdfUrl: downloadUrl,
                storagePath: fileName,
                uploadedBy: user?.uid || 'anonymous',
                uploadedAt: new Date().toISOString(),
                verified: false,
                chaptersCount: 0,
                chaptersExtracted: false
            };
        }

        const docRef = await addDoc(collection(db, 'textbooks'), textbookData);

        return {
            success: true,
            textbookId: docRef.id,
            downloadUrl
        };
    } catch (error) {
        console.error("Error uploading textbook:", error);
        return { success: false, error: error.message };
    }
}

// Save extracted chapters for a textbook
export async function saveTextbookChapters(textbookId, chapters) {
    try {
        // Save each chapter
        for (const chapter of chapters) {
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

        // Update textbook document with chapters count
        const textbookRef = doc(db, 'textbooks', textbookId);
        await updateDoc(textbookRef, {
            chaptersCount: chapters.length,
            chaptersExtracted: true
        });

        return { success: true };
    } catch (error) {
        console.error("Error saving chapters:", error);
        return { success: false, error: error.message };
    }
}

// Get chapters for a textbook
export async function getTextbookChapters(textbookId) {
    try {
        console.log("Fetching chapters for book:", textbookId);
        const startTime = Date.now();

        const chaptersRef = collection(db, 'textbook_chapters');

        // First, get all chapters to debug
        const allSnapshot = await getDocs(chaptersRef);
        console.log(`📚 Total chapters in collection: ${allSnapshot.size}`);
        if (allSnapshot.size > 0 && allSnapshot.size < 10) {
            allSnapshot.forEach(doc => {
                console.log(`  Chapter ${doc.id}:`, doc.data().bookId, 'vs', textbookId);
            });
        }

        // Now query for specific book
        const q = query(chaptersRef, where('bookId', '==', textbookId));
        const snapshot = await getDocs(q);
        console.log(`Query took ${Date.now() - startTime}ms, found ${snapshot.size} chapters`);

        const chapters = [];
        snapshot.forEach(doc => {
            chapters.push({ id: doc.id, ...doc.data() });
        });

        // Sort locally instead of in Firestore
        chapters.sort((a, b) => (a.chapterNum || 0) - (b.chapterNum || 0));

        return chapters;
    } catch (error) {
        console.error("Error getting chapters:", error);
        return [];
    }
}

// Search chapters by keyword/topic
export async function searchChapters(query, filters = {}) {
    try {
        // Get all chapters for the class/subject
        const chaptersRef = collection(db, 'textbook_chapters');
        let q;

        if (filters.bookId) {
            q = query(chaptersRef, where('bookId', '==', filters.bookId));
        } else {
            q = query(chaptersRef, limit(100));
        }

        const snapshot = await getDocs(q);
        const chapters = [];
        const searchLower = query.toLowerCase();

        snapshot.forEach(doc => {
            const data = doc.data();
            // Search in title, content, keywords
            if (data.title?.toLowerCase().includes(searchLower) ||
                data.content?.toLowerCase().includes(searchLower) ||
                data.keywords?.some(k => k.toLowerCase().includes(searchLower))) {
                chapters.push({ id: doc.id, ...data });
            }
        });

        return chapters;
    } catch (error) {
        console.error("Error searching chapters:", error);
        return [];
    }
}

