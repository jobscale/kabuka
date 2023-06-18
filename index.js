const { logger } = require('@jobscale/logger');
const { kabuka } = require('./app');
const { list } = require('./app/list');

const wait = ms => new Promise(resolve => { setTimeout(resolve, ms); });

class App {
  postSlack(body) {
    const url = 'https://jsx.jp/api/slack';
    const options = {
      method: 'post',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    };
    return fetch(url, options)
    .then(res => res.json())
    .then(data => {
      logger.info(data);
    });
  }

  async post(rowsList) {
    const rows = rowsList.flat();
    if (!rows.length) return;
    logger.info(rows);
    // eslint-disable-next-line no-plusplus
    for (let i = 0; i < rows.length; ++i && await wait(8000)) {
      await this.postSlack({
        channel: '#random',
        icon_emoji: ':moneybag:',
        username: 'Kabuka',
        text: rows[i],
      });
    }
  }

  fetch(code) {
    return kabuka.fetch(code)
    .catch(e => logger.error({ error: e.massage, status: e.status, code }) || []);
  }

  async start() {
    const rows = await Promise.all(list.map(code => this.fetch(code)));
    return this.post(rows);
  }
}

new App().start()
.catch(e => {
  logger.error(e.message, e);
});
