const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const zxcvbn = require('zxcvbn');
const crypto = require('crypto');
const db = require('../../../db');
const {
    authLimiter,
    regLimiter,
    refreshLimiter,
} = require('../../middleware/limiter');
const {
    cookies,
    regRequirements,
    loginRequirements,
} = require('./auth-requirements');

const router = express.Router();
router.post('/register', regLimiter, async (req, res) => {
    const parsed = regRequirements.safeParse(req.body);

    if (!parsed.success) {
        const message = parsed.error.issues.map((i) => i.message).join('; ');
        return res.status(400).json({ error: message });
    }

    const { fullName, login, password, birthDate, gender, diabetesType } =
        parsed.data;

    const alreadyExists = db
        .prepare('SELECT * FROM users WHERE login = ?')
        .get(login);

    if (alreadyExists) {
        return res.status(409).json({
            error: 'Логин уже существует.',
        });
    }

    const passwordCheck = zxcvbn(password);

    if (passwordCheck.score <= 2) {
        return res.status(400).json({ error: 'Слишком простой пароль.' });
    }

    const passwordHash = await bcrypt.hash(password, 14);

    const insert = db.prepare(`
    INSERT INTO users (full_name, login, password_hash, birth_date, gender, diabetes_type, created_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `);

    const saveRefreshToken = db.prepare(`
            INSERT INTO tokens (user_id, token_hash, expires_at, created_at, revoked)
            VALUES (?, ?, datetime('now', '+15 days'), datetime('now'), ?)
    `);
    const registerUser = db.transaction(() => {
        const result = insert.run(
            fullName,
            login,
            passwordHash,
            birthDate,
            gender,
            diabetesType,
        );

        const user = {
            id: Number(result.lastInsertRowid),
            fullName: fullName,
            login: login,
            birthDate: birthDate,
            gender: gender,
            diabetesType: diabetesType,
        };

        const accessToken = jwt.sign(
            { id: Number(user.id), type: 'access' },
            process.env.JWT_SECRET,
            {
                expiresIn: '15m',
            },
        );

        const refreshToken = jwt.sign(
            { id: Number(user.id), type: 'refresh' },
            process.env.JWT_SECRET,
            { expiresIn: '15d' },
        );

        const tokenHash = crypto
            .createHash('sha256')
            .update(refreshToken)
            .digest('hex');

        saveRefreshToken.run(user.id, tokenHash, 0);

        return { user, accessToken, refreshToken };
    });

    const { user, accessToken, refreshToken } = registerUser();

    cookies(res, refreshToken);

    return res.status(201).json({
        accessToken,
        user,
    });
});

router.post('/login', authLimiter, async (req, res) => {
    const parsed = loginRequirements.safeParse(req.body);

    if (!parsed.success) {
        const message = parsed.error.issues.map((i) => i.message).join('; ');
        return res.status(400).json({
            error: message,
        });
    }

    const { login, password } = parsed.data;

    const row = db.prepare('SELECT * FROM users WHERE login = ?').get(login);
    if (!row) {
        return res.status(401).json({
            error: 'Неверный логин или пароль.',
        });
    }

    const check = await bcrypt.compare(password, row.password_hash);

    if (!check) {
        return res.status(401).json({
            error: 'Неверный логин или пароль.',
        });
    }

    const user = {
        id: Number(row.id),
        fullName: row.full_name,
        login: row.login,
        birthDate: row.birth_date,
        gender: row.gender,
        diabetesType: row.diabetes_type,
    };

    const accessToken = jwt.sign(
        { id: Number(user.id), type: 'access' },
        process.env.JWT_SECRET,
        {
            expiresIn: '15m',
        },
    );

    const refreshToken = jwt.sign(
        { id: Number(user.id), type: 'refresh' },
        process.env.JWT_SECRET,
        {
            expiresIn: '15d',
        },
    );

    const saveRefreshToken = db.prepare(`
        INSERT INTO tokens (user_id, token_hash, expires_at, created_at, revoked)
            VALUES (?, ?, datetime('now', '+15 days'), datetime('now'), ?)
    `);

    const tokenHash = crypto
        .createHash('sha256')
        .update(refreshToken)
        .digest('hex');

    saveRefreshToken.run(user.id, tokenHash, 0);

    cookies(res, refreshToken);

    return res.status(200).json({
        accessToken,
        user,
    });
});

router.post('/refresh', refreshLimiter, (req, res) => {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
        return res.status(401).json({ error: 'Требуется вход в аккаунт.' });
    }
    let payload;

    try {
        payload = jwt.verify(refreshToken, process.env.JWT_SECRET);
    } catch {
        return res.status(401).json({ error: 'Некорректный токен.' });
    }

    if (payload.type !== 'refresh') {
        return res.status(401).json({ error: 'Некорректный токен.' });
    }

    const row = db.prepare('SELECT * FROM users WHERE id = ?').get(payload.id);

    if (!row) {
        return res.status(400).json({ error: 'Некорректный токен' });
    }
    const user = {
        id: Number(row.id),
        fullName: row.full_name,
        login: row.login,
        birthDate: row.birth_date,
        gender: row.gender,
        diabetesType: row.diabetes_type,
    };

    const tokenHash = crypto
        .createHash('sha-256')
        .update(refreshToken)
        .digest('hex');

    const findHash = db
        .prepare(
            `SELECT * FROM tokens WHERE token_hash = ? AND revoked = 0 AND expires_at > datetime('now')`,
        )
        .get(tokenHash);

    if (!findHash) {
        return res.status(401).json({ error: 'Некорректный токен.' });
    }

    const renewedAccessToken = jwt.sign(
        { id: Number(payload.id), type: 'access' },
        process.env.JWT_SECRET,
        { expiresIn: '15m' },
    );

    const renewedRefreshToken = jwt.sign(
        { id: Number(payload.id), type: 'refresh' },
        process.env.JWT_SECRET,
        { expiresIn: '15d' },
    );

    const revokeOldToken = db.prepare(
        'UPDATE tokens SET revoked = 1 WHERE id = ?',
    );
    const saveNewToken = db.prepare(
        `INSERT INTO tokens (user_id, token_hash, expires_at, created_at, revoked) 
        VALUES (?, ?, datetime('now', '+15 days'), datetime('now'), 0)`,
    );

    const rotateDeal = db.transaction(() => {
        revokeOldToken.run(findHash.id);
        saveNewToken.run(
            Number(payload.id),
            crypto
                .createHash('sha-256')
                .update(renewedRefreshToken)
                .digest('hex'),
        );
    });

    rotateDeal();

    cookies(res, renewedRefreshToken);

    return res
        .status(200)
        .json({ accessToken: renewedAccessToken, user: user });
});

router.post('/logout', (req, res) => {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
        return res.status(400).json({ error: 'Некорректный токен.' });
    }

    let payload;

    try {
        payload = jwt.verify(refreshToken, process.env.JWT_SECRET);
    } catch {
        return res.status(401).json({ error: 'Некорректный токен.' });
    }

    if (payload.type !== 'refresh') {
        return res.status(401).json({ error: 'Некорректный токен.' });
    }
    const tokenHash = crypto
        .createHash('sha-256')
        .update(refreshToken)
        .digest('hex');

    const revoked = db
        .prepare(
            'UPDATE tokens SET revoked = 1 WHERE token_hash = ? AND revoked = 0',
        )
        .run(tokenHash);

    if (revoked.changes === 0) {
        return res.status(401).json({ error: 'Некорректный токен.' });
    }

    res.clearCookie('refreshToken', { path: '/api/auth' });

    return res.status(200).json({ message: 'Успешный выход из системы.' });
});

module.exports = router;
