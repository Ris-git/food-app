const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const DEFAULT_TIME_ZONE = process.env.RESTAURANT_TIME_ZONE || 'Asia/Kolkata';

const timeToMinutes = (value) => {
  const [hours, minutes] = String(value || '').split(':').map(Number);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null;
  return hours * 60 + minutes;
};

const zonedClock = (date, timeZone) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    day: String(values.weekday).toLowerCase(),
    minutes: Number(values.hour) * 60 + Number(values.minute),
  };
};

const scheduleIsOpen = (operatingHours, date = new Date(), timeZone = DEFAULT_TIME_ZONE) => {
  if (!operatingHours) return true;
  const clock = zonedClock(date, timeZone);
  const dayIndex = DAYS.indexOf(clock.day);
  const schedule = operatingHours[clock.day];

  if (schedule?.isOpen) {
    const open = timeToMinutes(schedule.openTime);
    const close = timeToMinutes(schedule.closeTime);
    if (open !== null && close !== null) {
      if (open === close) return true;
      if (close > open && clock.minutes >= open && clock.minutes < close) return true;
      if (close < open && clock.minutes >= open) return true;
    }
  }

  const previousDay = DAYS[(dayIndex + DAYS.length - 1) % DAYS.length];
  const previousSchedule = operatingHours[previousDay];
  if (previousSchedule?.isOpen) {
    const previousOpen = timeToMinutes(previousSchedule.openTime);
    const previousClose = timeToMinutes(previousSchedule.closeTime);
    if (previousOpen !== null && previousClose !== null && previousClose < previousOpen && clock.minutes < previousClose) return true;
  }

  return false;
};

const getPublicAvailability = (restaurant, date = new Date(), timeZone = DEFAULT_TIME_ZONE) => {
  const configuredStatus = restaurant.operationalStatus || 'CLOSED';
  if (configuredStatus === 'CLOSED' || configuredStatus === 'TEMPORARILY_UNAVAILABLE') {
    return { isOpenNow: false, operationalStatus: configuredStatus };
  }
  if (!scheduleIsOpen(restaurant.operatingHours, date, timeZone)) {
    return { isOpenNow: false, operationalStatus: 'CLOSED' };
  }
  return { isOpenNow: true, operationalStatus: configuredStatus };
};

module.exports = { getPublicAvailability, scheduleIsOpen };
