import dayjs from 'dayjs';

Object.assign(process.env, {
  TZ: 'Asia/Tokyo',
});

export const getHoliday = async () => {
  const holidays = await fetch('https://holidays-jp.github.io/api/v1/datetime.json')
  .then(res => res.json());

  const now = dayjs();
  const dayAfter = [];
  for (let i = 0; i <= 10; i++) {
    const after = now.add(i, 'day').startOf('day');
    const holiday = holidays[after.unix()];
    if (holiday) {
      dayAfter.push({
        after: i,
        holiday,
        message: `${i === 0 ? '今日' : `${i}日後`} ${after.format('YYYY-MM-DD')} は「${holiday}」です`,
      });
    }
  }

  return dayAfter.map(item => item.message);
};

export const isHoliday = async () => {
  const today = dayjs().startOf('day');
  if ([0, 6].includes(today.day())) return true;

  const holidays = await fetch('https://holidays-jp.github.io/api/v1/datetime.json')
  .then(res => res.json());

  return Boolean(holidays[today.unix()]);
};

export default {
  getHoliday,
  isHoliday,
};
