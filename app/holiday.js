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
      const when = ['今日', '明日', '明後日'][i] ?? `${i}日後`;
      const message = `${when} ${after.format('YYYY-MM-DD')} は「${holiday}」です`;
      dayAfter.push({
        after: i,
        holiday,
        message,
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
