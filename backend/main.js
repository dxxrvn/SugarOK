const express = require('express');
const db = require('./db');
const app = express();

app.use(express.json());

function requirements(
    glucose,
    date,
    time,
    meal,
    feeling,
    note,
    partial = false,
) {
    if (!partial && (!glucose || !date || !time || !meal || !feeling)) {
        return 'Missing required fields';
    }

    if (glucose && typeof glucose !== 'number') {
        return 'Glucose must be a number';
    }

    if (meal && !['before', 'after'].includes(meal)) {
        return 'Meal must be either "before" or "after"';
    }

    if (feeling && !['good', 'normal', 'bad'].includes(feeling)) {
        return 'Feeling must be either "good", "normal" or "bad"';
    }

    if (note && typeof note !== 'string') {
        return 'Note must be a string';
    }

    return null;
}

const users = [{ id: 1, email: 'test@mail.ru', password: '123123' }];

app.post('/api/measurements', (req, res) => {
    const { glucose, date, time, meal, feeling, note } = req.body;

    const error = requirements(glucose, date, time, meal, feeling, note);

    if (error) {
        return res.status(400).json({ error: error });
    }

    const insert = db.prepare(`
    INSERT INTO measurements (glucose, date, time, meal, feeling, note, created_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `);

    const result = insert.run(glucose, date, time, meal, feeling, note || null);

    return res.status(201).json({
        id: Number(result.lastInsertRowid),
        message: 'Measurement saved successfully',
    });
});

app.get('/api/measurements', (req, res) => {
    const getAll = db.prepare(
        'SELECT * FROM measurements ORDER BY created_at DESC',
    );
    const getByDateRange = db.prepare(
        'SELECT * FROM measurements WHERE date BETWEEN ? AND ? ORDER BY created_at DESC',
    );

    const { from, to } = req.query;

    if (from && to) {
        const rows = getByDateRange.all(from, to);
        return res.status(200).json(rows);
    }

    const rows = getAll.all();

    return res.status(200).json(rows);
});

app.get('/api/measurements/latest', (req, res) => {
    const getLatest = db.prepare(
        'SELECT * FROM measurements ORDER BY created_at DESC LIMIT 1',
    );
    const row = getLatest.get();

    if (!row) {
        return res.status(404).json({ error: 'No measurements found' });
    }

    return res.status(200).json(row);
});

app.get('/api/measurements/:id', (req, res) => {
    const getById = db.prepare('SELECT * FROM measurements WHERE id = ?');
    const row = getById.get(req.params.id);

    if (!row) {
        return res.status(404).json({ error: 'Measurement not found' });
    }

    return res.status(200).json(row);
});
``;

app.put('/api/measurements/:id', (req, res) => {
    const { glucose, date, time, meal, feeling, note } = req.body;

    const error = requirements(glucose, date, time, meal, feeling, note);

    if (error) {
        return res.status(400).json({ error: error });
    }

    const update = db.prepare(`
    UPDATE measurements
    SET glucose = ?, date = ?, time = ?, meal = ?, feeling = ?, note = ?
    WHERE id = ?
    `);

    const result = update.run(
        glucose,
        date,
        time,
        meal,
        feeling,
        note || null,
        req.params.id,
    );

    if (result.changes === 0) {
        return res.status(404).json({ error: 'Measurement not found' });
    }

    return res.status(200).json({
        id: Number(req.params.id),
        message: 'Measurement updated successfully',
    });
});

app.delete('/api/measurements/:id', (req, res) => {
    const del = db.prepare('DELETE FROM measurements WHERE id = ?');
    const result = del.run(req.params.id);

    if (result.changes === 0) {
        return res.status(404).json({ error: 'Measurement not found' });
    }

    return res.status(200).json({
        id: Number(req.params.id),
        message: 'Measurement deleted successfully',
    });
});

app.patch('/api/measurements/:id', (req, res) => {
    const { glucose, date, time, meal, feeling, note } = req.body;
    const id = Number(req.params.id);

    const error = requirements(glucose, date, time, meal, feeling, note, true);

    if (error) {
        return res.status(400).json({ error: error });
    }

    const getById = db
        .prepare('SELECT * FROM measurements WHERE id = ?')
        .get(id);

    if (!getById) {
        return res.status(404).json({ error: 'Measurement not found' });
    }

    const updates = [
        'glucose',
        'date',
        'time',
        'meal',
        'feeling',
        'note',
    ].filter((field) => req.body[field] !== undefined);

    if (updates.length === 0) {
        return res.status(400).json({ error: 'No measurements to update' });
    }

    let setParts = [];
    let values = [];

    for (const field of [
        'glucose',
        'date',
        'time',
        'meal',
        'feeling',
        'note',
    ]) {
        if (req.body[field] !== undefined) {
            setParts.push(field + ' = ?');
            values.push(req.body[field]);
        }
    }

    const finalResult =
        'UPDATE measurements SET ' + setParts.join(', ') + 'WHERE id = ?';

    db.prepare(finalResult).run(...values, id);

    return res
        .status(200)
        .json({ id: id, message: 'Measurement updated successfully' });
});

app.listen(3000, () => {
    console.log('Server is running on: http://localhost:3000');
});
