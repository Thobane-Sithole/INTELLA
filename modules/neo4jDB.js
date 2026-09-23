// Neo4j Aura Database Module for INTELLA
// Replaces Firestore for student profiles, progress, and chat history
// All queries go through /api/neo4j (Vercel serverless proxy)

const NEO4J_API = '/api/neo4j';

async function run(query, parameters = {}) {
    const res = await fetch(NEO4J_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, parameters }),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error || 'Neo4j query failed');
    }
    const data = await res.json();
    return data.rows || [];
}

// ── Schema setup (run once on first deploy) ──────────────────────────────────

export async function initNeo4jSchema() {
    // Constraints ensure uniqueness and speed up lookups
    const constraints = [
        'CREATE CONSTRAINT IF NOT EXISTS FOR (u:User) REQUIRE u.uid IS UNIQUE',
        'CREATE CONSTRAINT IF NOT EXISTS FOR (s:StudentProfile) REQUIRE s.uid IS UNIQUE',
        'CREATE CONSTRAINT IF NOT EXISTS FOR (c:ChatSession) REQUIRE c.id IS UNIQUE',
    ];
    for (const q of constraints) {
        try { await run(q); } catch { /* ignore if already exists */ }
    }
    console.log('✅ Neo4j schema ready');
}

// ── Student Profile ───────────────────────────────────────────────────────────

export async function saveStudentProfile(uid, profile) {
    await run(
        `MERGE (s:StudentProfile {uid: $uid})
         SET s += $props, s.updatedAt = datetime()`,
        { uid, props: { ...profile, uid } }
    );
}

export async function loadStudentProfile(uid) {
    const rows = await run(
        'MATCH (s:StudentProfile {uid: $uid}) RETURN s',
        { uid }
    );
    return rows[0]?.s || null;
}

// ── Progress Tracking ─────────────────────────────────────────────────────────

export async function saveProgress(uid, subject, topic, knowledgeLevel, attempts) {
    await run(
        `MERGE (p:Progress {uid: $uid, subject: $subject, topic: $topic})
         SET p.knowledgeLevel = $knowledgeLevel,
             p.attempts = $attempts,
             p.lastPracticed = datetime()`,
        { uid, subject, topic, knowledgeLevel, attempts }
    );
}

export async function loadProgress(uid) {
    return run(
        'MATCH (p:Progress {uid: $uid}) RETURN p ORDER BY p.lastPracticed DESC',
        { uid }
    ).then(rows => rows.map(r => r.p));
}

export async function saveLearningState(uid, state) {
    await run(
        `MERGE (ls:LearningState {uid: $uid})
         SET ls += $props, ls.updatedAt = datetime()`,
        { uid, props: { ...state, uid } }
    );
}

export async function loadLearningState(uid) {
    const rows = await run(
        'MATCH (ls:LearningState {uid: $uid}) RETURN ls',
        { uid }
    );
    return rows[0]?.ls || null;
}

// ── Chat History ──────────────────────────────────────────────────────────────

export async function saveChatSession(uid, sessionId, title, mode, messages) {
    const cleanMessages = JSON.stringify(messages);
    await run(
        `MERGE (c:ChatSession {id: $sessionId})
         SET c.uid = $uid,
             c.title = $title,
             c.mode = $mode,
             c.messages = $cleanMessages,
             c.messageCount = $count,
             c.updatedAt = datetime(),
             c.createdAt = COALESCE(c.createdAt, datetime())`,
        { uid, sessionId, title, mode, cleanMessages, count: messages.length }
    );
}

export async function loadChatSessions(uid, limitCount = 50) {
    return run(
        `MATCH (c:ChatSession {uid: $uid})
         RETURN c.id AS id, c.title AS title, c.mode AS mode,
                c.messageCount AS messageCount, c.createdAt AS createdAt
         ORDER BY c.updatedAt DESC LIMIT $limitCount`,
        { uid, limitCount }
    );
}

export async function loadChatSession(uid, sessionId) {
    const rows = await run(
        'MATCH (c:ChatSession {id: $sessionId, uid: $uid}) RETURN c',
        { uid, sessionId }
    );
    if (!rows[0]?.c) return null;
    const c = rows[0].c;
    try { c.messages = JSON.parse(c.messages); } catch { c.messages = []; }
    return c;
}

export async function deleteChatSession(uid, sessionId) {
    await run(
        'MATCH (c:ChatSession {id: $sessionId, uid: $uid}) DELETE c',
        { uid, sessionId }
    );
}

export async function renameChatSession(uid, sessionId, title) {
    await run(
        'MATCH (c:ChatSession {id: $sessionId, uid: $uid}) SET c.title = $title',
        { uid, sessionId, title }
    );
}

// ── Quiz Results ──────────────────────────────────────────────────────────────

export async function saveQuizResult(uid, subject, topic, score, totalQuestions, timeTaken) {
    await run(
        `CREATE (q:QuizResult {
            uid: $uid, subject: $subject, topic: $topic,
            score: $score, totalQuestions: $totalQuestions,
            timeTaken: $timeTaken, completedAt: datetime()
        })`,
        { uid, subject, topic, score, totalQuestions, timeTaken }
    );
}

console.log('✅ Neo4j DB module loaded');
