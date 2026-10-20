const jwt = require('jsonwebtoken');

function auth(req, res, next) {
    const header = req.headers.authorization;

    if (!header || !header.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Токен не предоставлен.' });
    }
    try {
        const payload = jwt.verify(
            header.split(' ')[1],
            process.env.JWT_SECRET,
        );

        if (payload.type !== 'access') {
            return res.status(401).json({ error: 'Некорректный токен.' });
        }
        req.user = payload;
        next();
    } catch {
        return res.status(401).json({ error: 'Некорректный токен.' });
    }
}

module.exports = auth;
