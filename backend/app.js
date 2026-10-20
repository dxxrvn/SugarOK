const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookie = require('cookie-parser');
const auth = require('./api/middleware/auth');
const errorHandler = require('./api/middleware/error-handler');

const authRouter = require('./api/modules/auth/auth');
const measurementsRouter = require('./api/modules/measurements/measurements');
const medicationsRouter = require('./api/modules/medications/medications');
const appointmentsRouter = require('./api/modules/appointments/appointments');

const app = express();

app.use(
    cors({
        origin: `http://localhost:${process.env.FRONT_PORT}`,
        credentials: true,
    }),
);
app.use(cookie());
app.use(helmet());
app.use(express.json({ limit: '10kb' }));

app.use('/api/auth', authRouter);
app.use('/api/measurements', auth, measurementsRouter);
app.use('/api/medications', auth, medicationsRouter);
app.use('/api/appointments', auth, appointmentsRouter);

app.use((_req, res) => {
    res.status(404).json({ error: 'Не найдено.' });
});

app.use(errorHandler);

module.exports = app;
