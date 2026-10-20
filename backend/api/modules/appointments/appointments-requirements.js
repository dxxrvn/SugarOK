const { z } = require('zod');

const appointmentRequirements = z.object({
    doctor: z
        .string('Некорректный доктор.')
        .min(1, 'Некорректный доктор.')
        .max(100, 'Некорректный доктор.'),
    date: z.iso
        .date('Некорректная дата.')
        .refine(
            (d) => d >= '1900-01-01',
            'Дата не может быть раньше 1900 года.',
        )
        .refine(
            (d) => d <= '2100-12-31',
            'Дата не может быть позже 2100 года.',
        ),
    time: z.iso.time('Некорректное время.'),
    place: z.string().max(100).optional(),
    note: z.string().max(300).optional(),
});

module.exports = appointmentRequirements;
