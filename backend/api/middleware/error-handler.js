function errorHandler(error, _req, res, _next) {
    if (error.status >= 400 && error.status < 500) {
        let text;

        if (error.status === 413) {
            text = 'Слишком большой запрос.';
        } else {
            text = 'Некорректный запрос.';
        }
        return res.status(error.status).json({ error: text });
    }
    console.error(error);
    return res
        .status(500)
        .json({ error: 'Ошибка на стороне сервера, попробуйте позже.' });
}

module.exports = errorHandler;
