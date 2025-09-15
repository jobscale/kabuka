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

  async post({ blocks, text }, username) {
    if (!text && !blocks.length) return;
    logger.info(JSON.stringify(text || blocks, null, 2));
    await this.postSlack({
      channel: '#kabu',
      icon_emoji: ':moneybag:',
      username,
      text: text || username,
      blocks,
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
      .then(async rows => {
        for (const blocks of rows) {
          await this.post({ blocks }, 'Fund');
          await new Promise(resolve => { setTimeout(resolve, 8000); });
        }
      });
      return;
    }
    await kabuka.fetchKabu(list)
    .catch(e => logger.error({ e }) || [[]])
    .then(async rows => {
      for (const blocks of rows) {
        await this.post({ blocks }, 'Kabuka');
        await new Promise(resolve => { setTimeout(resolve, 8000); });
      }
    });
  }

  async start() {
    await this.fetch();
    await getHoliday()
    .then(holiday => this.post({ text: holiday.join('\n') }, 'Holiday'));
  }
}

new App().start()
.catch(e => {
  logger.error(e.message, e);
});
