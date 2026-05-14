const moment = require('moment-timezone');

const VIETNAM_TZ = 'Asia/Ho_Chi_Minh';

const nowVN = () => moment().tz(VIETNAM_TZ);

const todayVN = () => startOfDayVN(nowVN());

const toDateVN = (t) => startOfDayVN(t);

const toDateTimeVN = (t) => moment(t).tz(VIETNAM_TZ);

const toTimeVN = (t) => {
    const m = moment(t).tz(VIETNAM_TZ);
    return moment.tz(
        [2000, 0, 1, m.hour(), m.minute(), m.second(), m.millisecond()],
        VIETNAM_TZ,
    );
};

const isSameDayVN = (a, b) => {
    return toDateVN(a).isSame(toDateVN(b), 'day');
};

const startOfDayVN = (t) => {
    const m = moment(t).tz(VIETNAM_TZ);
    return m.clone().startOf('day');
};

const endOfDayVN = (t) => {
    const m = moment(t).tz(VIETNAM_TZ);
    return m.clone().endOf('day');
};

const startOfMonthVN = (t) => {
    const m = moment(t).tz(VIETNAM_TZ);
    return m.clone().startOf('month');
};

const endOfMonthVN = (t) => {
    const m = moment(t).tz(VIETNAM_TZ);
    return m.clone().endOf('month');
};

const isTodayVN = (t) => isSameDayVN(t, nowVN());

const getMonthRange = (year, month) => {
    const now = nowVN();

    if (!month || month < 1 || month > 12) {
        month = now.month() + 1;
    }
    if (!year || year <= 0) {
        year = now.year();
    }

    const start = moment.tz([year, month - 1, 1, 0, 0, 0, 0], VIETNAM_TZ);
    const end = start.clone().endOf('month');

    return { start, end };
};

const getWeekRange = (year, week) => {
    const now = nowVN();

    if (!week || week < 1 || week > 53) {
        year = now.isoWeekYear();
        week = now.isoWeek();
    }
    if (!year || year <= 0) {
        year = now.isoWeekYear();
    }

    const start = moment.tz([year, 0, 1, 0, 0, 0, 0], VIETNAM_TZ).isoWeek(week).startOf('isoWeek');
    const end = start.clone().endOf('isoWeek');

    return { start, end };
};

module.exports = {
    nowVN,
    todayVN,
    toDateVN,
    toDateTimeVN,
    toTimeVN,
    isSameDayVN,
    startOfDayVN,
    endOfDayVN,
    startOfMonthVN,
    endOfMonthVN,
    isTodayVN,
    getMonthRange,
    getWeekRange,
};
