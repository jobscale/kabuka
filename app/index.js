const { logger } = require('@jobscale/logger');
const dayjs = require('dayjs');
const { JSDOM } = require('jsdom');

const url = 'https://finance.yahoo.co.jp/quote/{{code}}';
const fund = 'https://fund.smbc.co.jp/smbchp/cgi/wrap/qjsonp.aspx?F=ctl/fnd_rank&DISPTYPE=sales_1m';

class Kabuka {
  scraping(document) {
    const main = document.querySelector('#detail').parentNode;
    const header = main.querySelector('header');
    const section = header.parentElement;
    const value = (() => {
      const line = section.querySelector('div:nth-child(3) > div:nth-child(2)').textContent;
      return line.replace('前日比', '前日比 ').replace('(', ' (');
    })();
    const name = header.querySelector('div:nth-child(1)').textContent;
    const price = header.querySelector('div:nth-child(2)').textContent;
    const rate = (main.querySelector('#all_rate > div > div > div:nth-child(2) > span > span') || {}).textContent;
    return { value, price, name, rate };
  }

  fetch(code) {
    if (Array.isArray(code)) return Promise.all(code.map(c => this.fetch(c)));
    const uri = url.replace(/{{code}}/, code);
    return fetch(uri, {
      headers: {
        'accept-language': 'ja',
        'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      },
    })
    .then(res => res.text())
    .then(data => new JSDOM(data).window.document)
    .then(document => this.scraping(document))
    .then(res => {
      const { value, price, name, rate } = res;
      return `${value}  |  ${price}\n${rate}  |  <${uri}|${name}  ${code}>`;
    })
    .catch(e => logger.warn({ code }, e));
  }

  fetchFund() {
    return fetch(fund, {
      headers: {
        'accept-language': 'ja',
        'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      },
    })
    .then(res => res.text())
    .then(body => body.replace(/^fnd_rank\(/, '').replace(/\)$/, ''))
    .then(text => {
      const json = JSON.parse(text);
      const ranking = json.section1.data
      .map(data => {
        const { Rank, FullName, NetAssetValue, ChangeValue } = data;
        const netAsset = Number.parseInt(NetAssetValue.replace(/,/, ''), 10);
        const change = Number.parseInt(ChangeValue, 10);
        const percent = Math.floor((change * 100) / netAsset) / 100;
        return `${Rank.padStart(2, ' ')} \t${NetAssetValue.padStart(8, ' ')} \t${ChangeValue.padStart(6, ' ')}   ( ${percent} % ) \t\t${FullName}`;
      })
      .join('\n');
      const [ts] = dayjs().add(9, 'hour').toISOString().split('T');
      return `${ts} Ranking\n${ranking}`;
    });
  }
}

module.exports = {
  Kabuka,
  kabuka: new Kabuka(),
};
