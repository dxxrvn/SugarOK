const { z } = require('zod');

const measureRequirements = z.object({
    glucose: z.coerce
        .number('Глюкоза должна быть числом.')
        .positive('Глюкоза должна быть положительным числом.')
        .min(0.5, 'Минимальное значение глюкозы - 0.5.')
        .max(50, 'Максимальное значение глюкозы - 50.'),
    date: z.iso
        .date('Некорректная дата.')
        .refine(
            (d) => d >= '1900-01-01',
            'Дата не может быть раньше 1900 года.',
        ),
    time: z.iso.time('Некорректное время.'),
    meal: z.enum(['before', 'after'], 'Некорректное время измерения.'),
    feeling: z.enum(['bad', 'normal', 'good'], 'Некорректное самочувствие.'),
    note: z.string().optional(),
});

const dateRangeCheck = z.object({
    from: z.iso.date('Некорректная начальная дата.'),
    to: z.iso.date('Некорректная конечная дата.'),
});

module.exports = { measureRequirements, dateRangeCheck };
