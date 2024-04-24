const { logger } = require('@jobscale/logger');
const dayjs = require('dayjs');
const { kabuka } = require('./app');
const {
  list,
  fundBase,
  funds,
} = require('./app/list');
const { holiday } = require('./app/holiday');

const wait = ms => new Promise(resolve => { setTimeout(resolve, ms); });

class App {
  async postSlack(body) {
    const url = 'https://jsx.jp/api/slack';
    const options = {
      method: 'post',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    };
    return fetch(url, options);
  }

  async post(rowsList) {
    const rows = rowsList.flat();
    if (!rows.length) return;
    logger.info(JSON.stringify(rows, null, 2));
    const opts = {};
    for (const row of rows) {
      if (!opts.first) opts.first = true;
      else await wait(8000);
      await this.postSlack({
        channel: '#kabu',
        icon_emoji: ':moneybag:',
        username: 'Kabuka',
        text: row,
      });
    }
  }

  fetch(code) {
    return kabuka.fetch(code)
    .catch(e => logger.error({ code, e }) || []);
  }

  fetchFund() {
    return kabuka.fetchFund(fundBase, funds);
  }

  async start() {
    const [, time] = dayjs().add(9, 'hour').toISOString().split('T');
    const [hh, mm] = time.split(':');
    const clock = `${hh}:${mm}`;
    if (clock < '12:00') {
      await this.fetchFund()
      .then(rows => this.post([rows]));
      return;
    }
    if (await holiday.isHoliday()) {
      logger.info('holiday today');
      return;
    }
    await Promise.all(list.map(code => this.fetch(code)))
    .then(rows => this.post(rows));
  }
}

new App().start()
.catch(e => {
  logger.error(e.message, e);
});
