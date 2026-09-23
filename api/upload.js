// Vercel Serverless Function - File Upload to Gemini
// Handles PDF/image uploads securely

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    if (!GEMINI_API_KEY) {
        return res.status(500).json({ error: 'API key not configured' });
    }

    try {
        const { fileData, mimeType, displayName } = req.body;

        if (!fileData || !mimeType) {
            return res.status(400).json({ error: 'File data and mime type are required' });
        }

        const uploadUrl = `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${GEMINI_API_KEY}`;

        // Convert base64 to buffer
        const buffer = Buffer.from(fileData, 'base64');

        const response = await fetch(uploadUrl, {
            method: 'POST',
            headers: {
                'Content-Type': mimeType,
                'X-Goog-Upload-Protocol': 'raw',
                'X-Goog-Upload-Command': 'upload, finalize',
                'X-Goog-Upload-Header-Content-Length': buffer.length.toString()
            },
            body: buffer
        });

        const data = await response.json();

        if (!response.ok) {
            return res.status(response.status).json(data);
        }

        return res.status(200).json(data);

    } catch (error) {
        console.error('File Upload Error:', error);
        return res.status(500).json({ error: 'Failed to upload file', details: error.message });
    }
};

// Config for larger file uploads
module.exports.config = {
    api: {
        bodyParser: {
            sizeLimit: '20mb'
        }
    }
};
