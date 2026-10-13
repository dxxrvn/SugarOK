require('dotenv').config();
const express = require('express');
const db = require('./db');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { z } = require('zod');

const app = express();

app.use(cors());
app.use(express.json());

function auth(req, res, next) {
    const header = req.headers.authorization;

    if (!header || !header.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Токен не предоставлен.' });
    }
    try {
        req.user = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
        next();
    } catch {
        return res.status(401).json({ error: 'Некорректный токен.' });
    }
}

app.use('/api/measurements', auth);
app.use('/api/medications', auth);
app.use('/api/appointments', auth);

const dateRangeCheck = z.object({
    from: z.iso.date('Некорректная начальная дата.'),
    to: z.iso.date('Некорректная конечная дата.'),
});

const regRequirements = z.object({
    fullName: z.string('Некорректное имя.').min(1, 'Некорректное имя.'),
    login: z
        .string('Логин должен быть строкой.')
        .min(3, 'Логин должен содержать не менее 3 символов.'),
    password: z.string().min(6, 'Пароль должен содержать не менее 6 символов.'),
    birthDate: z.iso.date('Некорректная дата рождения.'),
    gender: z.enum(['male', 'female'], 'Некорректно указан пол.'),
    diabetesType: z.enum(
        ['type1', 'type2', 'gestational', 'other'],
        'Некорректно указан тип диабета.',
    ),
});

const loginRequirements = regRequirements.pick({
    login: true,
    password: true,
});

const measureRequirements = z.object({
    glucose: z.coerce
        .number('Глюкоза должна быть числом.')
        .positive('Глюкоза должна быть положительным числом.'),
    date: z.iso.date('Некорректная дата.'),
    time: z.iso.time('Некорректное время.'),
    meal: z.enum(['before', 'after'], 'Некорректное время измерения.'),
    feeling: z.enum(['bad', 'normal', 'good'], 'Некорректное самочувствие.'),
    note: z.string().optional(),
});

const medRequirements = z.object({
    name: z.string('Некорректное имя.').min(1, 'Некорректное имя.'),
    doses: z.coerce
        .number('Некорректное количество доз.')
        .min(1, 'Некорректное количество доз.')
        .max(20, 'Некорректное количество доз.'),
    time: z.iso.time('Некорректное время.'),
});

const appointmentRequirements = z.object({
    doctor: z.string('Некорректный доктор.').min(1, 'Некорректный доктор.'),
    date: z.iso.date('Некорректная дата.'),
    time: z.iso.time('Некорректное время.'),
    place: z.string().optional(),
    note: z.string().optional(),
});

app.post('/api/auth/register', async (req, res) => {
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
            message: 'Логин уже существует.',
        });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const insert = db.prepare(`
    INSERT INTO users (full_name, login, password_hash, birth_date, gender, diabetes_type, created_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `);

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

    const token = jwt.sign({ id: Number(user.id) }, process.env.JWT_SECRET, {
        expiresIn: '7d',
    });
    return res.status(201).json({
        token,
        user,
    });
});

app.post('/api/auth/login', async (req, res) => {
    const parsed = loginRequirements.safeParse(req.body);

    if (!parsed.success) {
        const message = parsed.error.issues.map((i) => i.message).join('; ');
        return res.status(400).json({
            error: message,
        });
    }

    const { login, password } = parsed.data;

    const userInfo = db
        .prepare('SELECT * FROM users WHERE login = ?')
        .get(login);
    if (!userInfo) {
        return res.status(401).json({
            error: 'Неверный логин или пароль.',
        });
    }

    const check = await bcrypt.compare(password, userInfo.password_hash);

    if (!check) {
        return res.status(401).json({
            error: 'Неверный логин или пароль.',
        });
    }

    const user = {
        id: Number(userInfo.id),
        fullName: userInfo.full_name,
        login: userInfo.login,
        birthDate: userInfo.birth_date,
        gender: userInfo.gender,
        diabetesType: userInfo.diabetes_type,
    };

    const token = jwt.sign({ id: Number(user.id) }, process.env.JWT_SECRET, {
        expiresIn: '7d',
    });

    return res.status(200).json({
        token,
        user,
    });
});

app.post('/api/measurements', (req, res) => {
    const parsed = measureRequirements.safeParse(req.body);

    if (!parsed.success) {
        const message = parsed.error.issues.map((i) => i.message).join('; ');
        return res.status(400).json({ error: message });
    }

    const { glucose, date, time, meal, feeling, note } = parsed.data;

    const insert = db.prepare(`
    INSERT INTO measurements (user_id, glucose, date, time, meal, feeling, note, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);

    const result = insert.run(
        req.user.id,
        glucose,
        date,
        time,
        meal,
        feeling,
        note || null,
    );
    return res.status(201).json({
        id: Number(result.lastInsertRowid),
        message: 'Информация об измерении успешно сохранена.',
    });
});

app.get('/api/measurements', (req, res) => {
    const getAll = db.prepare(
        'SELECT * FROM measurements WHERE user_id = ? ORDER BY created_at DESC',
    );
    const getByDateRange = db.prepare(
        'SELECT * FROM measurements WHERE user_id = ? AND date BETWEEN ? AND ? ORDER BY created_at DESC',
    );

    const { from, to } = req.query;

    if (from !== undefined || to !== undefined) {
        const parsed = dateRangeCheck.safeParse(req.query);

        if (!parsed.success) {
            const message = parsed.error.issues
                .map((i) => i.message)
                .join('; ');
            return res.status(400).json({ error: message });
        }

        const rows = getByDateRange.all(
            req.user.id,
            parsed.data.from,
            parsed.data.to,
        );

        return res.status(200).json(rows);
    }

    const rows = getAll.all(req.user.id);

    if (rows.length === 0) {
        return res
            .status(404)
            .json({ error: 'Информация об измерениях не найдена.' });
    }

    return res.status(200).json(rows);
});

app.get('/api/measurements/latest', (req, res) => {
    const getLatest = db.prepare(
        'SELECT * FROM measurements WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
    );
    const row = getLatest.get(req.user.id);

    if (!row) {
        return res
            .status(404)
            .json({ error: 'Информация об измерении не найдена.' });
    }

    return res.status(200).json(row);
});

app.get('/api/measurements/:id', (req, res) => {
    const getById = db.prepare(
        'SELECT * FROM measurements WHERE id = ? AND user_id = ?',
    );
    const row = getById.get(req.params.id, req.user.id);

    if (!row) {
        return res
            .status(404)
            .json({ error: 'Информация об измерении не найдена.' });
    }

    return res.status(200).json(row);
});

app.put('/api/measurements/:id', (req, res) => {
    const parsed = measureRequirements.safeParse(req.body);

    if (!parsed.success) {
        const message = parsed.error.issues.map((i) => i.message).join('; ');
        return res.status(400).json({ error: message });
    }

    const { glucose, date, time, meal, feeling, note } = parsed.data;

    const update = db.prepare(`
    UPDATE measurements
    SET glucose = ?, date = ?, time = ?, meal = ?, feeling = ?, note = ?
    WHERE id = ? AND user_id = ?
    `);

    const result = update.run(
        glucose,
        date,
        time,
        meal,
        feeling,
        note || null,
        req.params.id,
        req.user.id,
    );

    if (result.changes === 0) {
        return res
            .status(404)
            .json({ error: 'Информация об измерении не найдена.' });
    }

    return res.status(200).json({
        id: Number(req.params.id),
        message: 'Информация об измерении успешно обновлена.',
    });
});

app.delete('/api/measurements/:id', (req, res) => {
    const del = db.prepare(
        'DELETE FROM measurements WHERE id = ? AND user_id = ?',
    );
    const result = del.run(req.params.id, req.user.id);

    if (result.changes === 0) {
        return res
            .status(404)
            .json({ error: 'Информация об измерении не найдена.' });
    }

    return res.status(200).json({
        id: Number(req.params.id),
        message: 'Информация об измерении успешно удалена.',
    });
});

app.patch('/api/measurements/:id', (req, res) => {
    const parsed = measureRequirements.partial().safeParse(req.body);

    if (!parsed.success) {
        const message = parsed.error.issues.map((i) => i.message).join('; ');
        return res.status(400).json({ error: message });
    }

    const id = Number(req.params.id);

    const getById = db
        .prepare('SELECT * FROM measurements WHERE id = ? AND user_id = ?')
        .get(id, req.user.id);

    if (!getById) {
        return res
            .status(404)
            .json({ error: 'Информация об измерении не найдена.' });
    }

    const setParts = [];
    const values = [];

    for (const field of [
        'glucose',
        'date',
        'time',
        'meal',
        'feeling',
        'note',
    ]) {
        if (parsed.data[field] !== undefined) {
            setParts.push(field + ' = ?');
            values.push(parsed.data[field]);
        }
    }

    if (setParts.length === 0) {
        return res.status(400).json({ error: 'Нет полей для обновления.' });
    }

    const finalResult =
        'UPDATE measurements SET ' +
        setParts.join(', ') +
        ' WHERE id = ? AND user_id = ?';

    db.prepare(finalResult).run(...values, id, req.user.id);

    return res.status(200).json({
        id: id,
        message: 'Информация об измерении успешно обновлена.',
    });
});

app.get('/api/medications', (req, res) => {
    const getAll = db.prepare(
        'SELECT * FROM medications WHERE user_id = ? ORDER BY created_at DESC',
    );

    const rows = getAll.all(req.user.id);

    if (rows.length === 0) {
        return res
            .status(404)
            .json({ error: 'Информация о лекарстве не найдена.' });
    }

    return res.status(200).json(rows);
});

app.post('/api/medications', (req, res) => {
    const parsed = medRequirements.safeParse(req.body);

    if (!parsed.success) {
        const message = parsed.error.issues.map((i) => i.message).join('; ');
        return res.status(400).json({ error: message });
    }

    const { name, doses, time } = parsed.data;

    const insert = db.prepare(`
        INSERT INTO medications (user_id, name, doses, time, created_at)
        VALUES (?, ?, ?, ?, datetime('now'))`);

    const result = insert.run(req.user.id, name, doses, time);

    return res.status(201).json({
        id: Number(result.lastInsertRowid),
        message: 'Информация о лекарстве успешно сохранена.',
    });
});

app.put('/api/medications/:id', (req, res) => {
    const parsed = medRequirements.safeParse(req.body);

    if (!parsed.success) {
        const message = parsed.error.issues.map((i) => i.message).join('; ');
        return res.status(400).json({ error: message });
    }

    const { name, doses, time } = parsed.data;

    const update = db.prepare(`
        UPDATE medications 
        SET name = ?, doses = ?, time = ? 
        WHERE id = ? AND user_id = ?`);

    const result = update.run(name, doses, time, req.params.id, req.user.id);

    if (result.changes === 0) {
        return res
            .status(404)
            .json({ error: 'Информация о лекарстве не найдена.' });
    }

    return res.status(200).json({
        id: req.params.id,
        message: 'Информация о лекарстве успешно обновлена.',
    });
});

app.delete('/api/medications/:id', (req, res) => {
    const del = db.prepare(
        'DELETE FROM medications WHERE user_id = ? AND id = ?',
    );

    const result = del.run(req.user.id, req.params.id);

    if (result.changes === 0) {
        return res
            .status(404)
            .json({ error: 'Информация о лекарстве не найдена.' });
    }

    return res.status(200).json({
        id: req.params.id,
        message: 'Информация о лекарстве успешно удалена.',
    });
});

app.get('/api/appointments', (req, res) => {
    const getAll = db.prepare(
        'SELECT * FROM appointments WHERE user_id = ? ORDER BY created_at DESC',
    );

    const rows = getAll.all(req.user.id);

    if (rows.length === 0) {
        return res.status(404).json({ error: 'Запись не найдена.' });
    }

    return res.status(200).json(rows);
});

app.post('/api/appointments', (req, res) => {
    const parsed = appointmentRequirements.safeParse(req.body);

    if (!parsed.success) {
        const message = parsed.error.issues.map((i) => i.message).join('; ');
        return res.status(400).json({ error: message });
    }

    const { doctor, date, time, place, note } = parsed.data;
    const insert = db.prepare(
        `INSERT INTO appointments (user_id, doctor, date, time, place, note, created_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
    );

    const result = insert.run(
        req.user.id,
        doctor,
        date,
        time,
        place || null,
        note || null,
    );

    return res.status(201).json({
        id: Number(result.lastInsertRowid),
        message: 'Запись успешно сохранена.',
    });
});

app.put('/api/appointments/:id', (req, res) => {
    const parsed = appointmentRequirements.safeParse(req.body);

    if (!parsed.success) {
        const message = parsed.error.issues.map((i) => i.message).join('; ');
        return res.status(400).json({ error: message });
    }

    const { doctor, date, time, place, note } = parsed.data;

    const update = db.prepare(
        'UPDATE appointments SET doctor = ?, date = ?, time = ?, place = ?, note = ? WHERE id = ? AND user_id = ?',
    );

    const result = update.run(
        doctor,
        date,
        time,
        place || null,
        note || null,
        req.params.id,
        req.user.id,
    );

    if (result.changes === 0) {
        return res.status(404).json({ error: 'Запись не найдена.' });
    }

    return res.status(200).json({
        id: req.params.id,
        message: 'Запись успешно обновлена.',
    });
});

app.delete('/api/appointments/:id', (req, res) => {
    const del = db.prepare(
        'DELETE FROM appointments WHERE user_id = ? AND id = ?',
    );

    const result = del.run(req.user.id, req.params.id);

    if (result.changes === 0) {
        return res.status(404).json({ error: 'Запись не найдена.' });
    }

    return res.status(200).json({
        id: req.params.id,
        message: 'Запись успешно удалена.',
    });
});

app.listen(process.env.PORT, () => {
    console.log(`Server is running on: http://localhost:${process.env.PORT}`);
});
