// Vercel Serverless Function — Neo4j Aura Database
// All Cypher queries go through this secure proxy

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const NEO4J_URI      = process.env.NEO4J_URI;       // e.g. neo4j+s://xxxx.databases.neo4j.io
    const NEO4J_USER     = process.env.NEO4J_USERNAME;  // usually "neo4j"
    const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD;

    if (!NEO4J_URI || !NEO4J_PASSWORD) {
        return res.status(500).json({ error: 'Neo4j credentials not configured' });
    }

    try {
        const { query, parameters = {} } = req.body;
        if (!query) return res.status(400).json({ error: 'query is required' });

        // Neo4j Aura HTTP API (no driver needed — pure REST)
        const httpBase = NEO4J_URI
            .replace('neo4j+s://', 'https://')
            .replace('neo4j://', 'http://');

        const endpoint = `${httpBase}/db/neo4j/tx/commit`;
        const credentials = Buffer.from(`${NEO4J_USER}:${NEO4J_PASSWORD}`).toString('base64');

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${credentials}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                statements: [{ statement: query, parameters }],
            }),
        });

        const data = await response.json();

        if (data.errors && data.errors.length > 0) {
            return res.status(400).json({ error: data.errors[0].message, code: data.errors[0].code });
        }

        // Flatten results into plain objects
        const results = data.results[0] || { columns: [], data: [] };
        const rows = results.data.map(row => {
            const obj = {};
            results.columns.forEach((col, i) => { obj[col] = row.row[i]; });
            return obj;
        });

        return res.status(200).json({ rows, columns: results.columns });
    } catch (err) {
        console.error('Neo4j error:', err);
        return res.status(500).json({ error: err.message });
    }
};
