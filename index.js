const { logger } = require('@jobscale/logger');
const dayjs = require('dayjs');
const { kabuka } = require('./app');
const {
  list,
  fundBase,
  funds,
} = require('./app/list');
const { holiday } = require('./app/holiday');

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

  async post(rowsList, username) {
    const rows = rowsList.flat();
    if (!rows.length) return;
    logger.info(JSON.stringify(rows, null, 2));
    await this.postSlack({
      channel: '#kabu',
      icon_emoji: ':moneybag:',
      username,
      text: rows.join('\n'),
    });
  }

  fetch() {
    return kabuka.fetch(list)
    .catch(e => logger.error({ e }) || []);
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
      .then(rows => this.post(rows, 'Kabuka'));
      return;
    }
    if (await holiday.isHoliday()) {
      logger.info('holiday today');
      return;
    }
    await this.fetch()
    .then(rows => this.post(rows, 'Fund'));
  }
}

new App().start()
.catch(e => {
  logger.error(e.message, e);
});
