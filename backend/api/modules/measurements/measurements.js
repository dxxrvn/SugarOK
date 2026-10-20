const express = require('express');
const { postLimiter, getLimiter } = require('../../middleware/limiter');
const db = require('../../../db');
const {
    measureRequirements,
    dateRangeCheck,
} = require('./measurements-requirements');

const { isFuture } = require('../../middleware/time');
const router = express.Router();

router.post('/', postLimiter, (req, res) => {
    const parsed = measureRequirements.safeParse(req.body);

    if (!parsed.success) {
        const message = parsed.error.issues.map((i) => i.message).join('; ');
        return res.status(400).json({ error: message });
    }

    const { glucose, date, time, meal, feeling, note } = parsed.data;

    if (isFuture(date, time, req)) {
        return res.status(400).json({ error: 'Введите корректное время.' });
    }

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

    const row = db
        .prepare('SELECT * FROM measurements WHERE id = ?')
        .get(result.lastInsertRowid);

    return res.status(201).json(row);
});

router.get('/', getLimiter, (req, res) => {
    const getAll = db.prepare(
        'SELECT * FROM measurements WHERE user_id = ? ORDER BY date DESC, time DESC, id DESC',
    );
    const getByDateRange = db.prepare(
        'SELECT * FROM measurements WHERE user_id = ? AND date BETWEEN ? AND ? ORDER BY date DESC, time DESC, id DESC',
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

    return res.status(200).json(rows);
});

router.get('/latest', getLimiter, (req, res) => {
    const getLatest = db.prepare(
        'SELECT * FROM measurements WHERE user_id = ? ORDER BY date DESC, time DESC, id DESC LIMIT 1',
    );
    const row = getLatest.get(req.user.id);

    if (!row) {
        return res.status(200).json(null);
    }

    return res.status(200).json(row);
});

router.get('/:id', getLimiter, (req, res) => {
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

router.put('/:id', postLimiter, (req, res) => {
    const parsed = measureRequirements.safeParse(req.body);

    if (!parsed.success) {
        const message = parsed.error.issues.map((i) => i.message).join('; ');
        return res.status(400).json({ error: message });
    }

    const { glucose, date, time, meal, feeling, note } = parsed.data;

    if (isFuture(date, time, req)) {
        return res.status(400).json({ error: 'Введите корректное время.' });
    }

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

router.delete('/:id', postLimiter, (req, res) => {
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

router.patch('/:id', postLimiter, (req, res) => {
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

    const newDate = parsed.data.date ?? getById.date;
    const newTime = parsed.data.time ?? getById.time;

    if (isFuture(newDate, newTime, req)) {
        return res.status(400).json({ error: 'Введите корректное время.' });
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

module.exports = router;
