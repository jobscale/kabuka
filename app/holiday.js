const { JSDOM } = require('jsdom');
const dayjs = require('dayjs');

const url = 'https://benri.com/calendar/';
const biz = [
  '2024-04-30',
  '2024-05-02',
  '2024-08-09',
  '2024-08-13',
  '2024-08-14',
  '2024-08-15',
  '2024-08-16',
  '2024-08-19',
  '2024-12-30',
  '2024-12-31',
  '2025-01-02',
  '2025-01-03',
  '2025-02-10',
];

class Holiday {
  scraping(document) {
    const main = document.querySelector('#ShukuList');
    const list = Array.from(main.querySelectorAll('.SH_dt'));
    const dts = list.map(div => {
      const [yy, mm, dd] = div.textContent.split(/[年月日]/);
      return dayjs(`${yy}-${mm}-${dd} 00:00+0900`);
    });
    return [
      ...dts,
      ...biz.map(ts => dayjs(`${ts} 00:00+0900`)),
    ];
  }

  async isHoliday(ts) {
    const { $y: yy, $M: mm, $D: dd, $W: ww } = dayjs(ts).add(9, 'hour');
    if ([0, 6].includes(ww)) return true;
    const today = dayjs(`${yy}-${mm + 1}-${dd} 00:00+0900`);
    return fetch(url)
    .then(res => res.text())
    .then(data => new JSDOM(data).window.document)
    .then(document => this.scraping(document))
    .then(res => {
      const isHoliday = res.find(
        holiday => holiday.toString() === today.toString(),
      );
      return isHoliday;
    });
  }
}

module.exports = {
  Holiday,
  holiday: new Holiday(),
};
