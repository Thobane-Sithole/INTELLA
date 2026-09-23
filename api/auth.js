// Vercel Serverless Function — Custom Auth (no Firebase)
// Handles register, login, google token verify, JWT verify, update-user, reset-password

const crypto = require('crypto');

const JWT_SECRET = process.env.JWT_SECRET || 'intella-dev-secret-change-in-prod';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const NEO4J_URI      = process.env.NEO4J_URI;
const NEO4J_USER     = process.env.NEO4J_USERNAME || 'neo4j';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD;

// ── Neo4j helper ──────────────────────────────────────────────────────────────

async function neo4j(query, parameters = {}) {
    const httpBase = NEO4J_URI
        .replace('neo4j+s://', 'https://')
        .replace('neo4j://', 'http://');
    const endpoint = `${httpBase}/db/neo4j/tx/commit`;
    const credentials = Buffer.from(`${NEO4J_USER}:${NEO4J_PASSWORD}`).toString('base64');

    const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
        body: JSON.stringify({ statements: [{ statement: query, parameters }] }),
    });
    const data = await res.json();
    if (data.errors?.length) throw new Error(data.errors[0].message);
    const results = data.results[0] || { columns: [], data: [] };
    return results.data.map(row => {
        const obj = {};
        results.columns.forEach((col, i) => { obj[col] = row.row[i]; });
        return obj;
    });
}

// ── Crypto helpers ─────────────────────────────────────────────────────────────

function hashPassword(password, salt) {
    return crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
}

function generateId() {
    return crypto.randomBytes(16).toString('hex');
}

// ── JWT (stateless HMAC-SHA256) ────────────────────────────────────────────────

function signJWT(payload) {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const body   = Buffer.from(JSON.stringify({
        ...payload,
        iat: Date.now(),
        exp: Date.now() + 7 * 24 * 60 * 60 * 1000
    })).toString('base64url');
    const sig = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
    return `${header}.${body}.${sig}`;
}

function verifyJWT(token) {
    const parts = (token || '').split('.');
    if (parts.length !== 3) throw new Error('Invalid token format');
    const [header, body, sig] = parts;
    const expected = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
    if (sig !== expected) throw new Error('Invalid token signature');
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (payload.exp < Date.now()) throw new Error('Token expired');
    return payload;
}

// ── Handler ────────────────────────────────────────────────────────────────────

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    if (!NEO4J_URI || !NEO4J_PASSWORD) {
        return res.status(500).json({ error: 'Database not configured' });
    }

    const { action } = req.body || {};

    try {
        // ── Register ──────────────────────────────────────────────────────────
        if (action === 'register') {
            const { email, password, displayName, grade } = req.body;
            if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
            if (password.length < 6)  return res.status(400).json({ error: 'Password must be at least 6 characters' });

            // Check existing
            const existing = await neo4j('MATCH (u:User {email: $email}) RETURN u.uid AS uid', { email: email.toLowerCase() });
            if (existing.length > 0) return res.status(409).json({ error: 'Email already in use' });

            const salt     = crypto.randomBytes(32).toString('hex');
            const uid      = generateId();
            const hash     = hashPassword(password, salt);
            const now      = new Date().toISOString();

            await neo4j(
                `CREATE (u:User {
                    uid: $uid, email: $email, displayName: $displayName,
                    grade: $grade, passwordHash: $hash, salt: $salt,
                    photoURL: null, createdAt: $now, provider: 'email'
                })`,
                { uid, email: email.toLowerCase(), displayName: displayName || 'Student', grade: parseInt(grade) || 10, hash, salt, now }
            );

            const token = signJWT({ uid, email: email.toLowerCase(), displayName: displayName || 'Student' });
            return res.status(200).json({ token, uid, email: email.toLowerCase(), displayName: displayName || 'Student', photoURL: null });
        }

        // ── Login ─────────────────────────────────────────────────────────────
        if (action === 'login') {
            const { email, password } = req.body;
            if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

            const rows = await neo4j(
                'MATCH (u:User {email: $email, provider: "email"}) RETURN u.uid AS uid, u.displayName AS displayName, u.passwordHash AS hash, u.salt AS salt, u.photoURL AS photoURL',
                { email: email.toLowerCase() }
            );
            if (rows.length === 0) return res.status(401).json({ error: 'Invalid email or password' });

            const user = rows[0];
            const attempt = hashPassword(password, user.salt);
            if (attempt !== user.hash) return res.status(401).json({ error: 'Invalid email or password' });

            const token = signJWT({ uid: user.uid, email: email.toLowerCase(), displayName: user.displayName });
            return res.status(200).json({ token, uid: user.uid, email: email.toLowerCase(), displayName: user.displayName, photoURL: user.photoURL });
        }

        // ── Google token verify ───────────────────────────────────────────────
        if (action === 'google') {
            const { idToken } = req.body;
            if (!idToken) return res.status(400).json({ error: 'idToken required' });

            // Verify with Google's tokeninfo endpoint
            const gRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
            const gData = await gRes.json();

            if (gData.error) return res.status(401).json({ error: 'Invalid Google token: ' + gData.error });
            if (GOOGLE_CLIENT_ID && gData.aud !== GOOGLE_CLIENT_ID) {
                return res.status(401).json({ error: 'Token audience mismatch' });
            }

            const { sub: googleId, email, name: displayName, picture: photoURL } = gData;
            const googleEmail = email.toLowerCase();

            // Find or create user
            let rows = await neo4j(
                'MATCH (u:User {email: $email}) RETURN u.uid AS uid, u.displayName AS displayName, u.photoURL AS photoURL',
                { email: googleEmail }
            );

            let uid, finalDisplayName, finalPhotoURL;
            if (rows.length > 0) {
                uid = rows[0].uid;
                finalDisplayName = rows[0].displayName;
                finalPhotoURL    = photoURL || rows[0].photoURL;
                // Update photoURL if changed
                await neo4j('MATCH (u:User {uid: $uid}) SET u.photoURL = $photoURL', { uid, photoURL: finalPhotoURL || null });
            } else {
                uid = generateId();
                finalDisplayName = displayName || 'Student';
                finalPhotoURL    = photoURL || null;
                const now = new Date().toISOString();
                await neo4j(
                    `CREATE (u:User {
                        uid: $uid, email: $email, displayName: $displayName,
                        grade: 10, passwordHash: null, salt: null,
                        photoURL: $photoURL, createdAt: $now, provider: 'google', googleId: $googleId
                    })`,
                    { uid, email: googleEmail, displayName: finalDisplayName, photoURL: finalPhotoURL, now, googleId }
                );
            }

            const token = signJWT({ uid, email: googleEmail, displayName: finalDisplayName });
            return res.status(200).json({ token, uid, email: googleEmail, displayName: finalDisplayName, photoURL: finalPhotoURL });
        }

        // ── Verify JWT ────────────────────────────────────────────────────────
        if (action === 'verify') {
            const token = (req.headers.authorization || '').replace('Bearer ', '') || req.body.token;
            const payload = verifyJWT(token);
            return res.status(200).json({ valid: true, ...payload });
        }

        // ── Update user ───────────────────────────────────────────────────────
        if (action === 'update-user') {
            const token = (req.headers.authorization || '').replace('Bearer ', '') || req.body.token;
            const { uid } = verifyJWT(token);
            const { displayName, photoURL } = req.body;
            const updates = {};
            if (displayName !== undefined) updates.displayName = displayName;
            if (photoURL !== undefined)    updates.photoURL    = photoURL;
            await neo4j('MATCH (u:User {uid: $uid}) SET u += $updates', { uid, updates });
            return res.status(200).json({ success: true });
        }

        // ── Reset password ────────────────────────────────────────────────────
        if (action === 'reset-password') {
            // Without a mail service, just confirm the email exists
            const { email } = req.body;
            const rows = await neo4j('MATCH (u:User {email: $email}) RETURN u.uid AS uid', { email: (email || '').toLowerCase() });
            // Always return success to avoid email enumeration
            return res.status(200).json({ success: true, message: 'If this email exists, a reset link has been sent.' });
        }

        return res.status(400).json({ error: `Unknown action: ${action}` });
    } catch (err) {
        console.error('Auth error:', err);
        return res.status(500).json({ error: err.message });
    }
};
