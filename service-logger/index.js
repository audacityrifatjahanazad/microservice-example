const express = require('express');
const fs = require('fs');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const cors = require('cors');

const app = express();
app.use(cors());
const port = 3004;


app.use(express.json());

// Ensure logs directory exists
const logDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
}

// Swagger definition
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Logger Service API',
            version: '1.0.0',
            description: 'API for Logger Service',
        },
        servers: [
            {
                url: `http://localhost:${port}`,
            },
        ],
    },
    apis: ['./index.js'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

/**
 * @swagger
 * /log:
 *   post:
 *     summary: Log a message
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               service:
 *                 type: string
 *               message:
 *                 type: string
 *               level:
 *                 type: string
 *     responses:
 *       200:
 *         description: Log recorded successfully
 */
app.post('/log', (req, res) => {
    const { service, message, level } = req.body;
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${level || 'INFO'}] [${service}]: ${message}\n`;

    fs.appendFile(path.join(logDir, 'all.log'), logEntry, (err) => {
        if (err) {
            console.error('Error writing to log file:', err);
            return res.status(500).json({ error: 'Failed to write log' });
        }
        res.status(200).json({ status: 'logged' });
    });
});

app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
});

app.listen(port, () => {

    console.log(`Logger Service running on port ${port}`);
});
