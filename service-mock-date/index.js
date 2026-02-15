const express = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const cors = require('cors');

const app = express();
app.use(cors());
const port = 3003;


// Swagger definition
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Mock Date Service API',
      version: '1.0.0',
      description: 'API for Mock Date Service',
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
 * /date:
 *   get:
 *     summary: Get the current mock date
 *     responses:
 *       200:
 *         description: A JSON object containing the date
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 date:
 *                   type: string
 *                   example: "2024-05-20"
 */
app.get('/date', (req, res) => {
  res.json({ date: '2024-05-20' }); // Fixed date as requested
});

app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

app.listen(port, () => {

  console.log(`Mock Date Service running on port ${port}`);
});
