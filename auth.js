// auth.js — INTELLA Authentication & Data (no Firebase)
// Auth: JWT via /api/auth  |  Google: Google Identity Services
// Database: Neo4j via modules/neo4jDB.js

import * as Neo4jDB from './modules/neo4jDB.js';

// ── State ─────────────────────────────────────────────────────────────────────

let currentUser    = null;   // { uid, email, displayName, photoURL }
let userProfile    = null;
let currentChatId  = null;

const AUTH_CACHE_KEY   = 'intella_auth_cache';
const AUTH_TOKEN_KEY   = 'intella_jwt';

// ── JWT helpers ───────────────────────────────────────────────────────────────

function saveToken(token, user) {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    cacheAuthState(user);
}

function getToken() {
    return localStorage.getItem(AUTH_TOKEN_KEY);
}

function clearToken() {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_CACHE_KEY);
}

async function callAuth(body) {
    const token = getToken();
    const res = await fetch('/api/auth', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
    });
    return res.json();
}

// ── Cache ─────────────────────────────────────────────────────────────────────

function cacheAuthState(user) {
    if (user) {
        localStorage.setItem(AUTH_CACHE_KEY, JSON.stringify({ ...user, isLoggedIn: true, cachedAt: Date.now() }));
    } else {
        localStorage.removeItem(AUTH_CACHE_KEY);
    }
}

export function getCachedAuthState() {
    try {
        const raw = localStorage.getItem(AUTH_CACHE_KEY);
        if (!raw) return null;
        const data = JSON.parse(raw);
        if (Date.now() - data.cachedAt < 7 * 24 * 60 * 60 * 1000) return data;
    } catch { /* ignore */ }
    return null;
}

// ── Header UI ─────────────────────────────────────────────────────────────────

export function updateHeaderAuthUI(authState) {
    const userBtn       = document.getElementById('user-btn');
    const userBtnText   = document.getElementById('user-btn-text');
    const userBtnIcon   = document.getElementById('user-btn-icon');
    const userBtnAvatar = document.getElementById('user-btn-avatar');

    if (authState?.isLoggedIn) {
        if (userBtn)     userBtn.classList.add('logged-in');
        if (userBtnText) userBtnText.textContent = '';
        if (authState.photoURL && userBtnAvatar) {
            userBtnAvatar.src = authState.photoURL;
            userBtnAvatar.classList.remove('hidden');
            if (userBtnIcon) userBtnIcon.classList.add('hidden');
        } else {
            const initial = (authState.displayName || authState.email || '').charAt(0).toUpperCase() || '👤';
            if (userBtnIcon) {
                userBtnIcon.textContent = initial;
                userBtnIcon.classList.remove('hidden');
                userBtnIcon.style.fontSize   = '1rem';
                userBtnIcon.style.fontWeight = '600';
            }
            if (userBtnAvatar) userBtnAvatar.classList.add('hidden');
        }
    } else {
        if (userBtn)     userBtn.classList.remove('logged-in');
        if (userBtnText) userBtnText.textContent = 'Login';
        if (userBtnIcon) {
            userBtnIcon.textContent  = '👤';
            userBtnIcon.classList.remove('hidden');
            userBtnIcon.style.fontSize   = '';
            userBtnIcon.style.fontWeight = '';
        }
        if (userBtnAvatar) userBtnAvatar.classList.add('hidden');
    }
}

// ── Init auth ─────────────────────────────────────────────────────────────────

export async function initAuth() {
    const cached = getCachedAuthState();
    if (cached) updateHeaderAuthUI(cached);

    const token = getToken();
    if (!token) return null;

    try {
        const data = await callAuth({ action: 'verify', token });
        if (data.valid) {
            currentUser = { uid: data.uid, email: data.email, displayName: data.displayName, photoURL: data.photoURL || null };
            cacheAuthState(currentUser);
            updateHeaderAuthUI({ ...currentUser, isLoggedIn: true });
            if (typeof window.updateCreditsDisplay === 'function') await window.updateCreditsDisplay();
            return currentUser;
        }
    } catch { /* token invalid or expired */ }

    clearToken();
    currentUser = null;
    updateHeaderAuthUI(null);
    return null;
}

// ── Email/Password Login ──────────────────────────────────────────────────────

export async function loginWithEmail(email, password) {
    try {
        const data = await callAuth({ action: 'login', email, password });
        if (data.error) return { success: false, error: data.error };
        currentUser = { uid: data.uid, email: data.email, displayName: data.displayName, photoURL: data.photoURL };
        saveToken(data.token, currentUser);
        updateHeaderAuthUI({ ...currentUser, isLoggedIn: true });
        if (typeof window.updateCreditsDisplay === 'function') await window.updateCreditsDisplay();
        return { success: true, user: currentUser };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// ── Email/Password Signup ─────────────────────────────────────────────────────

export async function signupWithEmail(email, password, displayName, grade) {
    try {
        const data = await callAuth({ action: 'register', email, password, displayName, grade });
        if (data.error) return { success: false, error: data.error };
        currentUser = { uid: data.uid, email: data.email, displayName: data.displayName, photoURL: data.photoURL };
        saveToken(data.token, currentUser);
        updateHeaderAuthUI({ ...currentUser, isLoggedIn: true });
        return { success: true, user: currentUser };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// ── Google Sign-In (Google Identity Services) ─────────────────────────────────

export async function loginWithGoogle() {
    return new Promise((resolve) => {
        if (!window.google?.accounts?.id) {
            resolve({ success: false, error: 'Google Identity Services not loaded. Add your GOOGLE_CLIENT_ID to index.html.' });
            return;
        }
        window.google.accounts.id.prompt(async (notification) => {
            if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
                // Fallback: use renderButton or ask user to try again
                resolve({ success: false, error: 'Google Sign-In was dismissed. Please try again.' });
            }
        });
        // The credential callback is set up in initGoogleAuth (called from index.html)
        window._googleAuthResolve = resolve;
    });
}

// Called by Google Identity Services on successful credential
export async function handleGoogleCredential(idToken) {
    try {
        const data = await callAuth({ action: 'google', idToken });
        if (data.error) {
            if (window._googleAuthResolve) window._googleAuthResolve({ success: false, error: data.error });
            return;
        }
        currentUser = { uid: data.uid, email: data.email, displayName: data.displayName, photoURL: data.photoURL };
        saveToken(data.token, currentUser);
        updateHeaderAuthUI({ ...currentUser, isLoggedIn: true });
        if (typeof window.updateCreditsDisplay === 'function') await window.updateCreditsDisplay();
        if (window._googleAuthResolve) window._googleAuthResolve({ success: true, user: currentUser });
        window._googleAuthResolve = null;
    } catch (err) {
        if (window._googleAuthResolve) window._googleAuthResolve({ success: false, error: err.message });
        window._googleAuthResolve = null;
    }
}

// ── Logout ────────────────────────────────────────────────────────────────────

export async function logout() {
    clearToken();
    currentUser  = null;
    userProfile  = null;
    currentChatId = null;
    updateHeaderAuthUI(null);
    if (window.google?.accounts?.id) window.google.accounts.id.disableAutoSelect();
    return { success: true };
}

// ── Password Reset ────────────────────────────────────────────────────────────

export async function resetPassword(email) {
    try {
        const data = await callAuth({ action: 'reset-password', email });
        return { success: true, message: data.message || 'If this email exists, a reset link has been sent.' };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// ── Profile Photo (no cloud storage — use base64 or URL) ─────────────────────

export async function uploadProfilePicture(file) {
    if (!currentUser) return { success: false, error: 'Not logged in' };
    try {
        // Convert to base64 data URL and store in Neo4j
        const reader = new FileReader();
        const dataURL = await new Promise((res, rej) => {
            reader.onload  = e => res(e.target.result);
            reader.onerror = rej;
            reader.readAsDataURL(file);
        });
        // Store the photo URL in the user node
        await callAuth({ action: 'update-user', photoURL: dataURL });
        currentUser.photoURL = dataURL;
        cacheAuthState(currentUser);
        return { success: true, photoURL: dataURL };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// ── Update Display Name ───────────────────────────────────────────────────────

export async function updateDisplayName(displayName) {
    if (!currentUser) return { success: false, error: 'Not logged in' };
    try {
        await callAuth({ action: 'update-user', displayName });
        currentUser.displayName = displayName;
        cacheAuthState(currentUser);
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// ── Getters ───────────────────────────────────────────────────────────────────

export function getCurrentUser()  { return currentUser; }
export function getUserProfile()  { return userProfile; }
export function getCurrentChatId() { return currentChatId; }
export function setCurrentChatId(id) { currentChatId = id; }

// ── Progress (Neo4j) ──────────────────────────────────────────────────────────

export async function saveProgress(subject, topic, knowledgeLevel, attempts) {
    if (!currentUser) return { success: false, error: 'Not logged in' };
    if (!subject || !topic) return { success: false, error: 'Missing subject or topic' };
    try {
        await Neo4jDB.saveProgress(currentUser.uid, subject, topic, knowledgeLevel ?? 0, attempts ?? 0);
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

export async function loadProgress() {
    if (!currentUser) return [];
    try { return await Neo4jDB.loadProgress(currentUser.uid); } catch { return []; }
}

export async function saveLearningState(progressTracker) {
    if (!currentUser) return { success: false, error: 'Not logged in' };
    try {
        const state = {
            totalPoints: progressTracker.totalPoints ?? 0,
            level: progressTracker.level ?? 1,
            currentStreak: progressTracker.streakData?.currentStreak ?? 0,
            longestStreak: progressTracker.streakData?.longestStreak ?? 0,
            lastActiveDate: progressTracker.streakData?.lastActiveDate ?? new Date().toISOString().split('T')[0],
            achievements: JSON.stringify(Array.isArray(progressTracker.achievements) ? progressTracker.achievements : []),
        };
        await Neo4jDB.saveLearningState(currentUser.uid, state);
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

export async function loadLearningState() {
    if (!currentUser) return null;
    try {
        const state = await Neo4jDB.loadLearningState(currentUser.uid);
        if (!state) return null;
        try { state.achievements = JSON.parse(state.achievements || '[]'); } catch { state.achievements = []; }
        return state;
    } catch { return null; }
}

// ── Chat History (Neo4j) ──────────────────────────────────────────────────────

function generateTitle(messages) {
    const first = messages.find(m => m.role === 'user');
    let text = first?.content || first?.parts?.[0]?.text || '';
    text = text.trim().replace(/\n/g, ' ').replace(/\s+/g, ' ');
    text = text.replace(/^(hi|hello|hey|please|can you|explain|tell me)\s*/gi, '').trim();
    if (!text) return 'New Chat';
    return (text.charAt(0).toUpperCase() + text.slice(1)).substring(0, 50) || 'New Chat';
}

export async function saveChatHistory(mode, messages) {
    if (!currentUser) return { success: false, error: 'Not logged in' };
    const hasUser  = messages.some(m => m.role === 'user');
    const hasModel = messages.some(m => m.role === 'model' || m.role === 'assistant');
    if (!hasUser || !hasModel) return { success: false, error: 'Need conversation to save' };
    try {
        const sessionId = currentChatId || ('chat_' + Date.now());
        const title     = generateTitle(messages);
        await Neo4jDB.saveChatSession(currentUser.uid, sessionId, title, mode || 'chat', messages);
        currentChatId = sessionId;
        return { success: true, chatId: sessionId, title };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

export async function updateChatHistory(chatId, messages) {
    if (!currentUser || !chatId) return { success: false, error: 'Not logged in or no chat ID' };
    try {
        const session = await Neo4jDB.loadChatSession(currentUser.uid, chatId);
        const title = session?.title || generateTitle(messages);
        await Neo4jDB.saveChatSession(currentUser.uid, chatId, title, session?.mode || 'chat', messages);
        return { success: true, chatId };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

export async function loadChatHistory(limitCount = 50) {
    if (!currentUser) return [];
    try { return await Neo4jDB.loadChatSessions(currentUser.uid, limitCount); } catch { return []; }
}

export async function loadChat(chatId) {
    if (!currentUser || !chatId) return null;
    try { return await Neo4jDB.loadChatSession(currentUser.uid, chatId); } catch { return null; }
}

export async function deleteChat(chatId) {
    if (!currentUser || !chatId) return { success: false, error: 'Not logged in or no chat ID' };
    try {
        await Neo4jDB.deleteChatSession(currentUser.uid, chatId);
        if (currentChatId === chatId) currentChatId = null;
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

export async function renameChat(chatId, newTitle) {
    if (!currentUser || !chatId) return { success: false, error: 'Not logged in or no chat ID' };
    try {
        await Neo4jDB.renameChatSession(currentUser.uid, chatId, newTitle);
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// ── Quiz Results (Neo4j) ──────────────────────────────────────────────────────

export async function saveQuizResult(subject, topic, score, totalQuestions, timeTaken) {
    if (!currentUser) return { success: false, error: 'Not logged in' };
    try {
        await Neo4jDB.saveQuizResult(currentUser.uid, subject, topic, score, totalQuestions, timeTaken);
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// ── Student Profile (Neo4j) ───────────────────────────────────────────────────

export async function saveStudentProfileToFirestore(profileData) {
    if (!currentUser) return { success: false, error: 'Not logged in' };
    try {
        await Neo4jDB.saveStudentProfile(currentUser.uid, { ...profileData, uid: currentUser.uid });
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

export async function loadStudentProfileFromFirestore() {
    if (!currentUser) return { success: false, error: 'Not logged in', data: null };
    try {
        const data = await Neo4jDB.loadStudentProfile(currentUser.uid);
        return { success: true, data };
    } catch (err) {
        return { success: false, error: err.message, data: null };
    }
}

// ── Profile UI helpers ────────────────────────────────────────────────────────

export function showLoginForm() {
    updateHeaderAuthUI(null);
}

export function showUserProfile() {
    const authModal    = document.getElementById('auth-modal');
    const loginForm    = document.getElementById('login-form');
    const signupForm   = document.getElementById('signup-form');
    const userProfileDiv = document.getElementById('user-profile');
    const userBtn      = document.getElementById('user-btn');

    if (authModal)   authModal.classList.remove('hidden');
    if (loginForm)   loginForm.classList.add('hidden');
    if (signupForm)  signupForm.classList.add('hidden');

    let studentProfile = null;
    try {
        const saved = localStorage.getItem('intella_student_profile');
        if (saved) studentProfile = JSON.parse(saved);
    } catch { /* ignore */ }

    const user = currentUser;

    if (user && userProfileDiv) {
        const displayName = user.displayName || studentProfile?.displayName || 'Student';
        const el = id => document.getElementById(id);

        if (el('profile-name'))   el('profile-name').textContent  = displayName;
        if (el('profile-email'))  el('profile-email').textContent = user.email || '';

        if (el('profile-grade') && studentProfile) {
            const isUni = ['undergraduate','postgraduate','doctoral'].includes(studentProfile.educationLevel);
            if (isUni) {
                const prog = studentProfile.programName || (studentProfile.program || '').toUpperCase() || studentProfile.department || 'University';
                el('profile-grade').textContent = `${prog} - Year ${studentProfile.year || 1}`;
            } else {
                el('profile-grade').textContent = `Class ${studentProfile.class || 10} - ${(studentProfile.stream || 'Science')[0].toUpperCase() + (studentProfile.stream || 'Science').slice(1)}`;
            }
        }

        if (user.photoURL && el('profile-avatar-img')) {
            el('profile-avatar-img').src          = user.photoURL;
            el('profile-avatar-img').style.display = 'block';
            if (el('profile-avatar-text')) el('profile-avatar-text').style.display = 'none';
        } else {
            if (el('profile-avatar-img'))  el('profile-avatar-img').style.display  = 'none';
            if (el('profile-avatar-text')) { el('profile-avatar-text').style.display = 'block'; el('profile-avatar-text').textContent = displayName.charAt(0).toUpperCase(); }
        }

        if (el('profile-points')) el('profile-points').textContent = studentProfile?.totalPoints || 0;
        if (el('profile-streak')) el('profile-streak').textContent = studentProfile?.streak || 0;
        if (el('profile-topics')) el('profile-topics').textContent = studentProfile?.subjects?.length || 0;

        const linkBtn = document.getElementById('link-account-btn');
        const logoutBtn = document.getElementById('logout-btn');
        const photoBtn = document.getElementById('change-profile-pic-btn');
        if (linkBtn)   linkBtn.classList.add('hidden');
        if (logoutBtn) logoutBtn.classList.remove('hidden');
        if (photoBtn)  photoBtn.classList.remove('hidden');

        userProfileDiv.classList.remove('hidden');
    }

    if (userBtn) userBtn.textContent = user?.displayName?.split(' ')[0] || 'Profile';
}

export function updateUserProfile(updates) {
    if (!currentUser) return { success: false, error: 'Not logged in' };
    userProfile = { ...userProfile, ...updates };
    return { success: true };
}

// ── Textbook stubs (Neo4j-based, no file storage) ────────────────────────────

export async function getTextbooks(filters = {}) {
    try {
        const { rows } = await fetch('/api/neo4j', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: 'MATCH (t:Textbook) RETURN t LIMIT 100', parameters: {} }),
        }).then(r => r.json());
        return (rows || []).map(r => r.t);
    } catch { return []; }
}

export async function checkTextbookExists()           { return false; }
export async function checkUniversityTextbookExists() { return false; }

export async function uploadTextbook() {
    return { success: false, error: 'File storage not configured. Use Vercel Blob or Cloudinary.' };
}

export async function saveTextbookChapters(textbookId, chapters) {
    try {
        for (const ch of chapters) {
            await fetch('/api/neo4j', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: `MERGE (c:TextbookChapter {bookId: $bookId, chapterNum: $num})
                            SET c += $props`,
                    parameters: { bookId: textbookId, num: ch.chapterNum, props: ch },
                }),
            });
        }
        return { success: true };
    } catch (err) { return { success: false, error: err.message }; }
}

export async function getTextbookChapters(textbookId) {
    try {
        const { rows } = await fetch('/api/neo4j', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query: 'MATCH (c:TextbookChapter {bookId: $bookId}) RETURN c ORDER BY c.chapterNum',
                parameters: { bookId: textbookId },
            }),
        }).then(r => r.json());
        return (rows || []).map(r => r.c);
    } catch { return []; }
}

export async function searchChapters(searchQuery) {
    try {
        const { rows } = await fetch('/api/neo4j', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query: `MATCH (c:TextbookChapter)
                        WHERE toLower(c.title) CONTAINS toLower($q) OR toLower(c.content) CONTAINS toLower($q)
                        RETURN c LIMIT 20`,
                parameters: { q: searchQuery || '' },
            }),
        }).then(r => r.json());
        return (rows || []).map(r => r.c);
    } catch { return []; }
}

console.log('✅ Auth module loaded (Neo4j + JWT, no Firebase)');
