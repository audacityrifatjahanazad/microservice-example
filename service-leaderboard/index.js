const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const connectDB = require('./config/db');
const cors = require('cors');

// Models

const LeaderboardSchema = new mongoose.Schema({
    date: String,
    rankings: [
        {
            username: String,
            totalDuration: Number,
            rank: Number,
        },
    ],
});
const Leaderboard = mongoose.model('daily_leaders', LeaderboardSchema);

const app = express();
app.use(cors());
const port = 3002;


app.use(express.json());

// Connect DB
connectDB();

// Service URLs
const MOCK_DATE_SERVICE_URL = process.env.MOCK_DATE_SERVICE_URL || 'http://service-mock-date:3003';
const TIMER_SERVICE_URL = process.env.TIMER_SERVICE_URL || 'http://service-timer:3001';
const LOGGER_SERVICE_URL = process.env.LOGGER_SERVICE_URL || 'http://service-logger:3004';


// Helper for Logging
const logEvent = async (message, level = 'INFO') => {
    try {
        await axios.post(`${LOGGER_SERVICE_URL}/log`, {
            service: 'service-leaderboard',
            message,
            level,
        });
    } catch (err) {
        console.error('Failed to log to logging service', err.message);
    }
};

// Swagger
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: { title: 'Leaderboard Service API', version: '1.0.0' },
        servers: [{ url: `http://localhost:${port}` }],
    },
    apis: ['./index.js'],
};
const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

/**
 * @swagger
 * /generate:
 *   post:
 *     summary: Generate leaderboard for the current mock date
 *     responses:
 *       200:
 *         description: Leaderboard generated
 */
app.post('/generate', async (req, res) => {
    try {
        // 1. Get Date
        const dateRes = await axios.get(`${MOCK_DATE_SERVICE_URL}/date`);
        const date = dateRes.data.date;

        // 2. Get Audit Records
        const auditRes = await axios.get(`${TIMER_SERVICE_URL}/audit-records`, { params: { date } });
        const records = auditRes.data;


        // 3. Calculate Leaderboard
        const userDurations = {};
        records.forEach(record => {
            userDurations[record.username] = (userDurations[record.username] || 0) + record.duration;
        });

        const rankings = Object.entries(userDurations)
            .map(([username, totalDuration]) => ({ username, totalDuration }))
            .sort((a, b) => b.totalDuration - a.totalDuration)
            .map((item, index) => ({ ...item, rank: index + 1 }));

        // 4. Save to DB
        // Check if exists
        let dailyLeaderboard = await Leaderboard.findOne({ date });
        if (dailyLeaderboard) {
            dailyLeaderboard.rankings = rankings;
        } else {
            dailyLeaderboard = new Leaderboard({ date, rankings });
        }
        await dailyLeaderboard.save();

        await logEvent(`Leaderboard generated for ${date}`);

        res.json({ message: 'Leaderboard generated', date, rankings });

    } catch (err) {
        console.error(err);
        await logEvent(`Error generating leaderboard: ${err.message}`, 'ERROR');
        res.status(500).json({ error: err.message });
    }
});

/**
 * @swagger
 * /:
 *   get:
 *     summary: Get leaderboard by date
 *     parameters:
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *         description: Date in YYYY-MM-DD format (optional, defaults to mock date if not provided)
 *     responses:
 *       200:
 *         description: Leaderboard data
 */
app.get('/', async (req, res) => {
    try {
        let { date } = req.query;

        if (!date) {
            const dateRes = await axios.get(`${MOCK_DATE_SERVICE_URL}/date`);
            date = dateRes.data.date;
        }

        const leaderboard = await Leaderboard.findOne({ date });
        if (!leaderboard) {
            return res.status(404).json({ message: 'No leaderboard found for this date' });
        }
        res.json(leaderboard);

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * @swagger
 * /summary:
 *   get:
 *     summary: Get leaderboard summary (Total Players, Top 5) for a specific date
 *     parameters:
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *         description: Date in YYYY-MM-DD format (optional, defaults to mock date if not provided)
 *     responses:
 *       200:
 *         description: Leaderboard summary
 */
app.get('/summary', async (req, res) => {
    try {
        let { date } = req.query;

        if (!date) {
            const dateRes = await axios.get(`${MOCK_DATE_SERVICE_URL}/date`);
            date = dateRes.data.date;
        }

        const leaderboard = await Leaderboard.findOne({ date });
        if (!leaderboard) {
            return res.status(404).json({ message: 'No leaderboard found for this date' });
        }

        const totalPlayers = leaderboard.rankings.length;
        const top5 = leaderboard.rankings.slice(0, 5);

        res.json({
            date,
            totalPlayers,
            top5
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api-docs.json', (req, res) => {

    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
});

app.listen(port, () => {

    console.log(`Leaderboard Service running on port ${port}`);
});
