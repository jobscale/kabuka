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

  async fetchFund() {
    const opts = { text: [] };
    for (const item of funds) {
      opts.text = ['Fund'];
      await kabuka.fetchFund(fundBase, { item, opts })
      .catch(e => logger.error({ e }) || [])
      .then(async blocks => {
        await this.post({ blocks, text: opts.text.join(' ') }, 'Fund');
        await new Promise(resolve => { setTimeout(resolve, 5000); });
      });
    }
  }

  async fetchKabu() {
    const opts = { text: [] };
    for (const item of list) {
      opts.text = ['Kabuka'];
      await kabuka.fetchKabu({ item, opts })
      .catch(e => logger.error({ e }) || [])
      .then(async blocks => {
        await this.post({ blocks, text: opts.text.join(' ') }, 'Kabuka');
        await new Promise(resolve => { setTimeout(resolve, 5000); });
      });
    }
  }

  async fetch() {
    if (await isHoliday()) {
      logger.info('holiday today');
      return;
    }
    const time = dayjs().format('HH:mm');
    if (time < '12:00') {
      await this.fetchFund();
      return;
    }
    await this.fetchKabu();
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
