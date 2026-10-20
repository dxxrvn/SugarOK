const express = require('express');
const { getLimiter, postLimiter } = require('../../middleware/limiter');
const appointmentRequirements = require('./appointments-requirements');
const db = require('../../../db');

const { isPast } = require('../../middleware/time');

const router = express.Router();

router.get('/', getLimiter, (req, res) => {
    const getAll = db.prepare(
        'SELECT * FROM appointments WHERE user_id = ? ORDER BY date ASC, time ASC, id ASC',
    );

    const rows = getAll.all(req.user.id);

    return res.status(200).json(rows);
});

router.post('/', postLimiter, (req, res) => {
    const parsed = appointmentRequirements.safeParse(req.body);

    if (!parsed.success) {
        const message = parsed.error.issues.map((i) => i.message).join('; ');
        return res.status(400).json({ error: message });
    }

    const { doctor, date, time, place, note } = parsed.data;

    if (isPast(date, time, req)) {
        return res.status(400).json({ error: 'Введите корректное время.' });
    }
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

    const row = db
        .prepare('SELECT * FROM appointments WHERE id = ?')
        .get(result.lastInsertRowid);

    return res.status(201).json(row);
});

router.put('/:id', postLimiter, (req, res) => {
    const parsed = appointmentRequirements.safeParse(req.body);

    if (!parsed.success) {
        const message = parsed.error.issues.map((i) => i.message).join('; ');
        return res.status(400).json({ error: message });
    }

    const { doctor, date, time, place, note } = parsed.data;

    if (isPast(date, time, req)) {
        return res.status(400).json({ error: 'Введите корректное время.' });
    }
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

router.delete('/:id', postLimiter, (req, res) => {
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

module.exports = router;
