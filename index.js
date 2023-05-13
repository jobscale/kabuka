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

  execute(code) {
    return kabuka.fetch(code)
    .then(async rows => {
      logger.info(rows);
      for (let i = 0; i < rows.length;) {
        await this.postSlack({
          channel: 'C4WN3244D',
          icon_emoji: ':moneybag:',
          username: 'Kabuka',
          text: rows[i],
        });
        if (++i < list.length) await wait(8000); // eslint-disable-line no-plusplus
      }
    });
  }

  async start() {
    for (let i = 0; i < list.length;) {
      const code = list[i];
      await this.execute(code);
      if (++i < list.length) await wait(7000); // eslint-disable-line no-plusplus
    }
  }
}

new App().start()
.catch(e => {
  logger.error(e.message, e);
});
