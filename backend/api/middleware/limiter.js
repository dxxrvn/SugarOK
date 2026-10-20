const rateLimit = require('express-rate-limit');

function limiter(windowMs, max) {
    return rateLimit({
        windowMs,
        max,
        standardHeaders: true,
        legacyHeaders: false,
        handler: (_req, res) =>
            res
                .status(429)
                .json({ error: 'Слишком много запросов. Попробуйте позже.' }),
    });
}

module.exports = {
    refreshLimiter: limiter(15 * 60 * 1000, 30),
    authLimiter: limiter(15 * 60 * 1000, 5),
    regLimiter: limiter(30 * 60 * 1000, 5),
    postLimiter: limiter(60 * 1000, 30),
    getLimiter: limiter(15 * 60 * 1000, 300),
};
