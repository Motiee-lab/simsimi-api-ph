const express = require('express');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATABASE_FILE = 'database.json';

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS middleware
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    next();
});

// Read database function
async function readDatabase() {
    try {
        const data = await fs.readFile(DATABASE_FILE, 'utf8');
        const parsed = JSON.parse(data);
        return parsed;
    } catch (error) {
        // If file doesn't exist or is invalid, return empty object
        return {};
    }
}

// Save database function
async function saveDatabase(data) {
    try {
        const jsonString = JSON.stringify(data, null, 2);
        await fs.writeFile(DATABASE_FILE, jsonString, 'utf8');
        return true;
    } catch (error) {
        console.error('Error saving database:', error);
        return false;
    }
}

// Clean text function
function cleanText(text) {
    return text.trim().toLowerCase();
}

// Process query function
async function processQuery(query) {
    if (!query || typeof query !== 'string') {
        return {
            status: 'error',
            message: 'Invalid request'
        };
    }

    const db = await readDatabase();
    const trimmedQuery = query.trim();

    // Check if it's a sim query
    if (trimmedQuery.toLowerCase().startsWith('sim ')) {
        const command = trimmedQuery.substring(4).trim(); // Remove "sim "
        
        // Check if it's a teach command
        if (command.toLowerCase().startsWith('teach ')) {
            const teachCmd = command.substring(6).trim(); // Remove "teach "
            const parts = teachCmd.split('|');
            
            if (parts.length === 2) {
                const ask = cleanText(parts[0]);
                const answer = parts[1].trim();
                
                if (ask && answer) {
                    // Initialize if not exists
                    if (!db[ask]) {
                        db[ask] = [];
                    }
                    
                    // Add answer if not duplicate
                    if (!db[ask].includes(answer)) {
                        db[ask].push(answer);
                        const saved = await saveDatabase(db);
                        
                        if (saved) {
                            return {
                                status: 'success',
                                message: 'Natuto na ako! Salamat sa pagturo!',
                                data: {
                                    ask: ask,
                                    answer: answer,
                                    total_answers: db[ask].length
                                }
                            };
                        } else {
                            return {
                                status: 'error',
                                message: 'Error sa pagsave ng database'
                            };
                        }
                    } else {
                        return {
                            status: 'info',
                            message: 'Alam ko na yan!',
                            data: {
                                ask: ask,
                                answer: answer
                            }
                        };
                    }
                } else {
                    return {
                        status: 'error',
                        message: 'Kailangan parehong may tanong at sagot. Gamitin: sim teach <tanong> | <sagot>'
                    };
                }
            } else {
                return {
                    status: 'error',
                    message: 'Mali ang format. Gamitin: sim teach <tanong> | <sagot>'
                };
            }
        }
        // Regular sim query
        else {
            const question = cleanText(command);
            
            if (question) {
                if (db[question] && db[question].length > 0) {
                    const answers = db[question];
                    const selected = answers[Math.floor(Math.random() * answers.length)];
                    
                    return {
                        status: 'success',
                        message: selected,
                        data: {
                            ask: question,
                            possible_answers: answers
                        }
                    };
                } else {
                    return {
                        status: 'error',
                        message: `Hindi ko alam sagot diyan! Turuan mo ako: sim teach ${question} | <sagot mo>`,
                        data: {
                            ask: question,
                            suggestion: `sim teach ${question} | <iyong sagot>`
                        }
                    };
                }
            } else {
                return {
                    status: 'error',
                    message: 'Pakilagay ang tanong. Gamitin: sim <tanong>'
                };
            }
        }
    } else {
        return {
            status: 'error',
            message: 'Maling command. Dapat magsimula sa "sim"',
            usage: [
                'sim <message>',
                'sim teach <ask> | <answer>'
            ]
        };
    }
}

// API Endpoint - GET
app.get('/', async (req, res) => {
    try {
        const { query } = req.query;
        
        if (!query) {
            return res.json({
                status: 'error',
                message: 'Query parameter is required',
                usage: [
                    'GET: /?query=sim <message>',
                    'GET: /?query=sim teach <ask> | <answer>'
                ]
            });
        }
        
        const result = await processQuery(query);
        res.json(result);
    } catch (error) {
        console.error('Error processing GET request:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error'
        });
    }
});

// API Endpoint - POST
app.post('/', async (req, res) => {
    try {
        const { query } = req.body;
        
        if (!query) {
            return res.status(400).json({
                status: 'error',
                message: 'Query is required in request body',
                usage: {
                    'POST': {
                        'Content-Type': 'application/json',
                        'body': { 'query': 'sim <message>' }
                    }
                }
            });
        }
        
        const result = await processQuery(query);
        res.json(result);
    } catch (error) {
        console.error('Error processing POST request:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error'
        });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'SimSimi Tagalog API',
        version: '1.0.0'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`SimSimi API running on port ${PORT}`);
    console.log(`GET: http://localhost:${PORT}/?query=sim%20hello`);
    console.log(`POST: http://localhost:${PORT}/ (with JSON body)`);
});
