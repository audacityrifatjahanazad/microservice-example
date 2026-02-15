const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const connectDB = require('./config/db');
const cors = require('cors');

// Models

const AuditSchema = new mongoose.Schema({
    username: String,
    startTime: Date,
    endTime: Date,
    duration: Number, // in seconds or ms
    date: String, // YYYY-MM-DD from mock service
});
const Audit = mongoose.model('audit_report', AuditSchema);

const app = express();
app.use(cors());
const port = 3001;


app.use(express.json());

// Connect DB
connectDB();

// Service URLs
const MOCK_DATE_SERVICE_URL = process.env.MOCK_DATE_SERVICE_URL || 'http://service-mock-date:3003';
const LOGGER_SERVICE_URL = process.env.LOGGER_SERVICE_URL || 'http://service-logger:3004';

// Helper for Logging
const logEvent = async (message, level = 'INFO') => {
    try {
        await axios.post(`${LOGGER_SERVICE_URL}/log`, {
            service: 'service-timer',
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
        info: { title: 'Timer Service API', version: '1.0.0' },
        servers: [{ url: `http://localhost:${port}` }],
    },
    apis: ['./index.js'],
};
const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// In-memory store for active timers (simple implementation)
// In production, use Redis or DB. For this exercise, simple object map.
const activeTimers = {};

/**
 * @swagger
 * /timer/start:
 *   post:
 *     summary: Start a timer for a user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *     responses:
 *       200:
 *         description: Timer started
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 timerId:
 *                   type: string
 */
app.post('/timer/start', async (req, res) => {
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: 'Username required' });

    const timerId = `${username}-${Date.now()}`;
    activeTimers[timerId] = { username, startTime: new Date() };

    await logEvent(`Timer started for user ${username} with ID ${timerId}`);
    res.json({ timerId, message: 'Timer started' });
});

/**
 * @swagger
 * /timer/stop:
 *   post:
 *     summary: Stop a timer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               timerId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Timer stopped and recorded
 */
app.post('/timer/stop', async (req, res) => {
    const { timerId } = req.body;
    const timer = activeTimers[timerId];

    if (!timer) return res.status(404).json({ error: 'Timer not found' });

    const endTime = new Date();
    const startTime = timer.startTime;
    const durationMs = endTime - startTime;
    const durationSeconds = durationMs / 1000;

    // Get Date from Mock Service
    let gameDate = '2024-01-01'; // Fallback
    try {
        const dateRes = await axios.get(`${MOCK_DATE_SERVICE_URL}/date`);
        gameDate = dateRes.data.date;
    } catch (err) {
        console.error('Failed to fetch date from mock service', err.message);
        await logEvent('Failed to fetch date from mock service', 'ERROR');
    }

    // Save to DB
    const report = new Audit({
        username: timer.username,
        startTime,
        endTime,
        duration: durationSeconds,
        date: gameDate,
    });

    await report.save();
    delete activeTimers[timerId];

    await logEvent(`Timer stopped for ${timer.username}. Duration: ${durationSeconds}s. Date: ${gameDate}`);

    res.json({
        message: 'Timer stopped',
        duration: durationSeconds,
        date: gameDate,
        record: report,
    });
});

/**
 * @swagger
 * /audit-records:
 *   get:
 *     summary: Get audit records by date
 *     parameters:
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *         description: Date in YYYY-MM-DD format
 *     responses:
 *       200:
 *         description: List of records
 */
app.get('/audit-records', async (req, res) => {
    const { date } = req.query;
    const query = date ? { date } : {};

    try {
        const records = await Audit.find(query);
        res.json(records);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
});

app.listen(port, () => {

    console.log(`Timer Service running on port ${port}`);
});

