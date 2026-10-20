function validTimeZone(tz) {
    if (!tz) {
        return null;
    }
    try {
        new Intl.DateTimeFormat('en', { timeZone: tz });
        return tz;
    } catch {
        return null;
    }
}

function getTimeZone(req) {
    return (
        validTimeZone(req.get('x-timezone')) ||
        Intl.DateTimeFormat().resolvedOptions().timeZone
    );
}

function nowIn(timeZone, shiftMinutes = 0) {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
    }).formatToParts(new Date(Date.now() + shiftMinutes * 60 * 1000));
    const get = (type) => parts.find((p) => p.type === type).value;
    return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}`;
}

function stamp(date, time) {
    return `${date} ${time.slice(0, 5)}`;
}

function isFuture(date, time, req) {
    return stamp(date, time) > nowIn(getTimeZone(req));
}

function isPast(date, time, req) {
    return stamp(date, time) < nowIn(getTimeZone(req));
}

module.exports = { isFuture, isPast, nowIn, getTimeZone };
