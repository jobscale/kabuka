import { logger } from '@jobscale/logger';
import dayjs from 'dayjs';
import { JSDOM } from 'jsdom';

const financeUrl = 'https://finance.yahoo.co.jp/quote/{{code}}';
const chartUrl = '/chart?trm=6m';
const fundRanking = 'https://fund.smbc.co.jp/smbchp/cgi/wrap/qjsonp.aspx?F=ctl/fnd_rank&DISPTYPE=sales_1m';

export class Kabuka {
  scraping(document, code) {
    const main = document.querySelector('main section > div:nth-child(2)');
    const name = main.querySelector('header')?.textContent || code;
    const area = main.querySelector('div:nth-child(3)');
    const price = area.querySelector('span')?.textContent;
    const changeText = area.querySelector('div dd')?.textContent || '';
    const [change, changeRate] = changeText.split(/[()]/);
    const bbs = document.querySelector('#all_rate > div');
    const rate = (() => {
      if (!bbs) return 'no care';
      if (!bbs.querySelector('span')) return 'no idea';
      return bbs.querySelector('span > span')?.textContent || 'keep';
    })();
    return { change, changeRate, price, name, rate };
  }

  async fetchKabu({ item, opts }, opt = { retry: 3 }) {
    if (Array.isArray(item)) {
      const blocks = [];
      for (const single of item) {
        blocks.push(await this.fetchKabu({ item: single, opts }));
      }
      return blocks;
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
      const { change, changeRate, price, name, rate } = res;
      opts.text.push(changeRate);
      return {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: ['```', `${`${change} (${changeRate})`.padStart(16)} ${price.padStart(8)} ${rate.padStart(8)}`, '```'].join('\n') },
          { type: 'mrkdwn', text: `<${chart}|${name} ${code}>` },
        ],
      };
    })
    .catch(async e => {
      logger.warn({ code }, e);
      await new Promise(resolve => { setTimeout(resolve, 1000); });
      opt.retry--;
      if (opt.retry >= 0) return this.fetch(item, opt);
      return {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: '' },
          { type: 'mrkdwn', text: `<${chart}|NG ${code}>` },
        ],
      };
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
        return `${Rank.padStart(2)} ${NetAssetValue.padStart(8)} ${ChangeValue.padStart(6)}   ( ${percent} % ) ${FullName}`;
      })
      .join('\n');
      const [ts] = dayjs().add(9, 'hour').toISOString().split('T');
      return `${ts} Ranking\n${ranking}`;
    });
  }

  async fetchFund(fundBase, { item, opts }) {
    if (Array.isArray(item)) {
      const blocks = [];
      for (const single of item) {
        blocks.push(await this.fetchFund(fundBase, { item: single, opts }));
      }
      return blocks;
    }
    const url = `https://fund.smbc.co.jp/smbchp/main/index.aspx?F=fnd_details&KEY1=${item.url}`;
    return fetch(`${fundBase}${item.url}`, {
      headers: {
        'accept-language': 'ja',
        'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      },
    })
    .then(res => res.text())
    .then(body => body.replace(/^fnd_details\(/, '').replace(/\)$/, ''))
    .then(text => {
      const json = JSON.parse(text);
      const [{
        FullName, NetAssetValue, ChangeValue, ChangeRate,
        InvestmentArea, InvestmentTarget,
        ReturnMonth1, ReturnMonth3, ReturnMonth6, ReturnYear1,
      }] = json.section1.data;
      opts.text.push(ChangeRate);
      const fullName = FullName.replace('＜', '\n＜').replace('（', '\n（')
      .split('\n').map(name => `<${url}|${name}>`);
      const nbsp = '　';
      return {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: ['```', `${`${ChangeValue} (${ChangeRate} %)`.padStart(16)} ${NetAssetValue.padStart(9)}`, '```', `<${url}|${nbsp}Month ${ReturnMonth1.padStart(9, nbsp)}>`, `<${url}|Month 3 ${ReturnMonth3.padStart(9, nbsp)}>`, `<${url}|Month 6 ${ReturnMonth6.padStart(9, nbsp)}>`, `<${url}|${nbsp}${nbsp}Year ${ReturnYear1.padStart(9, nbsp)}>`].join('\n') },
          { type: 'mrkdwn', text: [fullName.join('\n'), '', `${InvestmentArea} / ${InvestmentTarget}`].join('\n') },
        ],
      };
    });
  }
}

export const kabuka = new Kabuka();

export default {
  Kabuka,
  kabuka,
};
