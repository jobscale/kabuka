const { JSDOM } = require('jsdom');
const dayjs = require('dayjs');

const url = 'https://benri.com/calendar/';
const biz = [
  '2023-12-28',
  '2023-12-29',
  '2024-01-02',
  '2024-01-03',
  '2024-01-04',
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
        holiday => new Date(holiday) === new Date(today),
      );
      return isHoliday;
    });
  }
}

module.exports = {
  Holiday,
  holiday: new Holiday(),
};
