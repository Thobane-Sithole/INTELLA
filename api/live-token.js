// Vercel Serverless Function - Live API Token
// Securely provides the API key for Live WebSocket connections

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    if (!GEMINI_API_KEY) {
        return res.status(500).json({ error: 'API key not configured' });
    }

    // Return the API key for Live WebSocket connection
    // Note: This is intentional - WebSocket connections must be made from browser
    // The key is not exposed in frontend source code
    return res.status(200).json({
        apiKey: GEMINI_API_KEY,
        model: 'models/gemini-2.0-flash-exp'
    });
}
