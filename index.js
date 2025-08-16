import { logger } from '@jobscale/logger';
import dayjs from 'dayjs';
import { kabuka } from './app/index.js';
import {
  list,
  fundBase,
  funds,
} from './app/list.js';
import { isHoliday, getHoliday } from './app/holiday.js';

Object.assign(process.env, {
  TZ: 'Asia/Tokyo',
});

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

  async fetch() {
    if (await isHoliday()) {
      logger.info('holiday today');
      return;
    }
    const time = dayjs().format('hh:mm');
    if (time < '12:00') {
      await kabuka.fetchFund(fundBase, funds)
      .then(rows => this.post(rows, 'Fund'));
      return;
    }
    await kabuka.fetch(list)
    .catch(e => logger.error({ e }) || [])
    .then(rows => this.post(rows, 'Kabuka'));
  }

  async start() {
    await this.fetch();
    await getHoliday()
    .then(holiday => this.post(holiday, 'Holiday'));
  }
}

new App().start()
.catch(e => {
  logger.error(e.message, e);
});
