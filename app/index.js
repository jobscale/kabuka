const { logger } = require('@jobscale/logger');
const dayjs = require('dayjs');
const { JSDOM } = require('jsdom');

const financeUrl = 'https://finance.yahoo.co.jp/quote/{{code}}';
const fundRanking = 'https://fund.smbc.co.jp/smbchp/cgi/wrap/qjsonp.aspx?F=ctl/fnd_rank&DISPTYPE=sales_1m';

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
    const uri = financeUrl.replace(/{{code}}/, code);
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
