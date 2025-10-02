import { logger } from '@jobscale/logger';
import dayjs from 'dayjs';
import { JSDOM } from 'jsdom';
import yahooFinance from 'yahoo-finance2';

const financeUrl = 'https://finance.yahoo.co.jp/quote/{{code}}';
const chartUrl = '/chart?trm=6m';
const fundRanking = 'https://fund.smbc.co.jp/smbchp/cgi/wrap/qjsonp.aspx?F=ctl/fnd_rank&DISPTYPE=sales_1m';

const formatTimestamp = ts => new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Asia/Tokyo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
}).format(ts || new Date());

const formatDate = ts => {
  const [date] = formatTimestamp(ts).split(' ');
  return date;
};

const getChartPrices = async symbol => {
  const latest = await yahooFinance.chart(symbol, {
    period1: formatDate(dayjs().subtract(1, 'week')),
    period2: formatDate(dayjs()),
    interval: '1d',
  }).catch(e => logger.warn(symbol, e.message) || { quotes: [] });
  const [nowData, yesterday] = latest.quotes.filter(v => v.close).reverse();

  const dateYear3 = dayjs().subtract(3, 'year').startOf('month');
  const dateYear1 = dayjs().subtract(1, 'year').startOf('month');
  const dateMonth6 = dayjs().subtract(6, 'month').startOf('month');
  const dateMonth3 = dayjs().subtract(3, 'month').startOf('month');
  const dateMonth1 = dayjs().subtract(1, 'month').startOf('month');

  const [
    year3, year1, month6, month3, month1,
  ] = await Promise.all([
    dateYear3, dateYear1, dateMonth6, dateMonth3, dateMonth1,
  ].map(async period => {
    const { quotes: [history] } = await yahooFinance.chart(symbol, {
      period1: formatDate(period),
      period2: formatDate(period.add(1, 'week')),
      interval: '1mo',
    }).catch(e => logger.warn(e.message, symbol) || { quotes: [] });
    if (!history) return {};
    const difference = nowData.adjclose - history.adjclose;
    const result = {};
    result.diffAmount = difference.toLocaleString('ja-JP', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    result.diffRate = ((difference / history.adjclose) * 100).toLocaleString('ja-JP', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    if (result.diffAmount[0] !== '-') result.diffAmount = `+${result.diffAmount}`;
    if (result.diffRate[0] !== '-') result.diffRate = `+${result.diffRate}`;
    result.diffRate += '%';
    return result;
  }));

  const difference = nowData.close - yesterday.close;
  nowData.diffAmount = difference.toLocaleString('ja-JP', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  nowData.diffRate = ((difference / yesterday.close) * 100).toLocaleString('ja-JP', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  if (nowData.diffAmount[0] !== '-') nowData.diffAmount = `+${nowData.diffAmount}`;
  if (nowData.diffRate[0] !== '-') nowData.diffRate = `+${nowData.diffRate}`;
  nowData.diffRate += '%';
  nowData.close = nowData.close.toLocaleString('ja-JP', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  return [{
    year3, year1, month6, month3, month1,
  }, nowData];
};

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
    .then(async res => {
      const [{
        year3, year1, month6, month3, month1,
      }, nowData] = await getChartPrices(code);
      return [
        res,
        year3, year1, month6, month3, month1, nowData,
      ];
    })
    .then(res => {
      const [
        { change, changeRate, price, name, rate },
        year3, year1, month6, month3, month1, nowData,
      ] = res;
      opts.text.push(changeRate);
      const text = [
        `${`${change} (${changeRate})`.padStart(16)} ${price.padStart(8)} ${rate.padStart(8)}`,
        `year3  ${year3.diffAmount?.padStart(7)} ${`(${year3.diffRate})`.padStart(10)}`,
        `year1  ${year1.diffAmount?.padStart(7)} ${`(${year1.diffRate})`.padStart(10)}`,
        `month6 ${month6.diffAmount?.padStart(7)} ${`(${month6.diffRate})`.padStart(10)}`,
        `month3 ${month3.diffAmount?.padStart(7)} ${`(${month3.diffRate})`.padStart(10)}`,
        `month1 ${month1.diffAmount?.padStart(7)} ${`(${month1.diffRate})`.padStart(10)}`,
        `week1  ${nowData.diffAmount?.padStart(7)} ${`(${nowData.diffRate})`.padStart(10)} ${nowData.close.padStart(9)}`,
      ];
      return {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: ['```', ...text, '```'].join('\n'),
          },
          { type: 'mrkdwn', text: `<${chart}|${name} ${code}>` },
        ],
      };
    })
    .catch(async e => {
      logger.warn({ code }, e);
      await new Promise(resolve => { setTimeout(resolve, 1000); });
      opt.retry--;
      if (opt.retry >= 0) return this.fetchKabu(item, opt);
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
