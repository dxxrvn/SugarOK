const { z } = require('zod');

const medRequirements = z.object({
    name: z
        .string('Некорректное название.')
        .min(1, 'Некорректное название.')
        .max(100, 'Некорректное название.'),
    doses: z.coerce
        .number('Некорректное количество доз.')
        .int('Некорректное количество доз.')
        .min(1, 'Некорректное количество доз.')
        .max(20, 'Некорректное количество доз.'),
    time: z.iso.time('Некорректное время.'),
});

module.exports = medRequirements;
