const express = require('express');
const { getLimiter, postLimiter } = require('../../middleware/limiter');
const medRequirements = require('./medications-requirements');
const db = require('../../../db');

const router = express.Router();

router.get('/', getLimiter, (req, res) => {
    const getAll = db.prepare(
        'SELECT * FROM medications WHERE user_id = ? ORDER BY time ASC, id ASC',
    );

    const rows = getAll.all(req.user.id);

    return res.status(200).json(rows);
});

router.post('/', postLimiter, (req, res) => {
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

    const row = db
        .prepare('SELECT * FROM medications WHERE id = ?')
        .get(result.lastInsertRowid);

    return res.status(201).json(row);
});

router.put('/:id', postLimiter, (req, res) => {
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

router.delete('/:id', postLimiter, (req, res) => {
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

module.exports = router;
