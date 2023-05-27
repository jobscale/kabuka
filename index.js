const { logger } = require('@jobscale/logger');
const { fetch } = require('@jobscale/fetch');
const { kabuka } = require('./app');
const { list } = require('./app/list');

const wait = ms => new Promise(resolve => { setTimeout(resolve, ms); });

class App {
  postSlack(data) {
    const url = 'https://tanpo.jsx.jp/api/slack';
    const options = {
      url,
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
      },
      data,
    };
    return fetch(options);
  }

  async post(rowsList) {
    const rows = rowsList.flat();
    if (!rows.length) return;
    logger.info(rows);
    // eslint-disable-next-line no-plusplus
    for (let i = 0; i < rows.length; ++i && await wait(8000)) {
      await this.postSlack({
        channel: 'C4WN3244D',
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
