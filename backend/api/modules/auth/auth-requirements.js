const { z } = require('zod');

const maxDate = () =>
    new Date(Date.now() + 14 * 3600 * 1000).toISOString().slice(0, 10);

const regRequirements = z.object({
    fullName: z
        .string('Некорректное имя.')
        .trim()
        .min(3, 'Некорректное имя.')
        .max(100, 'Некорректное имя.'),
    login: z
        .string('Логин должен быть строкой.')
        .trim()
        .toLowerCase()
        .min(3, 'Логин должен содержать не менее 3 символов.')
        .max(32, 'Логин должен содержать не более 32 символов.'),
    password: z
        .string()
        .min(8, 'Пароль должен содержать не менее 8 символов.')
        .max(72, 'Пароль должен содержать не более 72 символов.'),
    birthDate: z.iso
        .date('Некорректная дата рождения.')
        .refine(
            (d) => d >= '1900-01-01',
            'Дата не может быть раньше 1900 года.',
        )
        .refine(
            (d) => d <= maxDate(),
            'Дата рождения не может быть в будущем.',
        ),
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

function cookies(res, refreshToken) {
    res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: 15 * 24 * 60 * 60 * 1000,
        path: '/api/auth',
    });
}
module.exports = {
    regRequirements,
    loginRequirements,
    cookies,
};
