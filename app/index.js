const { logger } = require('@jobscale/logger');
const dayjs = require('dayjs');
const { JSDOM } = require('jsdom');

const financeUrl = 'https://finance.yahoo.co.jp/quote/{{code}}';
const chartUrl = '/chart?trm=6m';
const fundRanking = 'https://fund.smbc.co.jp/smbchp/cgi/wrap/qjsonp.aspx?F=ctl/fnd_rank&DISPTYPE=sales_1m';

class Kabuka {
  scraping(document, code) {
    const main = document.querySelector('main section > div:nth-child(2)');
    const name = main.querySelector('header')?.textContent || code;
    const area = main.querySelector('div:nth-child(3)');
    const price = area.querySelector('span')?.textContent;
    const value = area.querySelector('div dd')?.textContent;
    const bbs = document.querySelector('#all_rate > div');
    const rate = (() => {
      if (!bbs) return 'not care';
      if (!bbs.querySelector('span')) return 'no idea';
      return bbs.querySelector('span > span')?.textContent || 'keep quiet';
    })();
    return { value, price, name, rate };
  }

  async fetch(item, opt = { retry: 3 }) {
    if (Array.isArray(item)) {
      const res = [];
      for (const single of item) {
        res.push(await this.fetch(single));
      }
      return res;
    }
    const { code } = item;
    const uri = financeUrl.replace(/{{code}}/, code);
    const chart = `${uri}${chartUrl}`;
    return fetch(uri, {
      headers: {
        'accept-language': 'ja',
        'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      },
    })
    .then(res => res.text())
    .then(data => new JSDOM(data).window.document)
    .then(document => this.scraping(document, code))
    .then(res => {
      const { value, price, name, rate } = res;
      return `${value}  |  *${price}*  |  <${chart}|${name}  ${code}>  |  ${rate}`;
    })
    .catch(async e => {
      logger.warn({ code }, e);
      await new Promise(resolve => { setTimeout(resolve, 1000); });
      opt.retry--;
      if (opt.retry >= 0) return this.fetch(item, opt);
      return `<${chart}|NG  ${code}>`;
    });
  }

  fundRanking() {
    return fetch(fundRanking, {
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
        const percent = Math.round((change * 10000) / netAsset) / 100;
        return `${Rank.padStart(2, ' ')} \t${NetAssetValue.padStart(8, ' ')} \t${ChangeValue.padStart(6, ' ')}   ( ${percent} % ) \t\t${FullName}`;
      })
      .join('\n');
      const [ts] = dayjs().add(9, 'hour').toISOString().split('T');
      return `${ts} Ranking\n${ranking}`;
    });
  }

  async fetchFund(fundBase, funds) {
    if (Array.isArray(funds)) {
      const res = [];
      for (const fund of funds) {
        res.push(await this.fetchFund(fundBase, fund));
      }
      return res;
    }
    const [ts] = dayjs().add(9, 'hour').toISOString().split('T');
    const url = `https://fund.smbc.co.jp/smbchp/main/index.aspx?F=fnd_details&KEY1=${funds.url}`;
    return fetch(`${fundBase}${funds.url}`, {
      headers: {
        'accept-language': 'ja',
        'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      },
    })
    .then(res => res.text())
    .then(body => body.replace(/^fnd_details\(/, '').replace(/\)$/, ''))
    .then(text => {
      const json = JSON.parse(text);
      const details = json.section1.data
      .map(data => {
        const {
          FullName, NetAssetValue, ChangeValue, ChangeRate,
          InvestmentArea, InvestmentTarget,
          ReturnMonth1, ReturnMonth3, ReturnMonth6, ReturnYear1,
        } = data;
        const detail = `${NetAssetValue.padStart(8, ' ')} \t${ChangeValue.padStart(6, ' ')}   ( ${ChangeRate} % ) \t\t<${url}|${FullName}>
${InvestmentArea} \t${InvestmentTarget} \t${ts} \t<${url}|Month> ${ReturnMonth1} \t<${url}|Month 3> ${ReturnMonth3} \t<${url}|Month 6> ${ReturnMonth6} \t<${url}|Year> ${ReturnYear1}
`;
        return detail;
      })
      .join('\n');
      return details;
    });
  }
}

module.exports = {
  Kabuka,
  kabuka: new Kabuka(),
};
