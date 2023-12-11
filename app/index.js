const { JSDOM } = require('jsdom');

const url = 'https://finance.yahoo.co.jp/quote/{{code}}';

class Kabuka {
  scraping(document) {
    const main = document.querySelector('#all_rate').parentNode;
    const header = main.querySelector('header');
    const section = header.parentElement;
    const value = section.querySelector('div:nth-child(3) > div:nth-child(2)').textContent;
    const name = header.querySelector('div:nth-child(1)').textContent;
    const price = header.querySelector('div:nth-child(2)').textContent;
    const rate = main.querySelector('#all_rate > div > div > div:nth-child(2) > span > span').textContent;
    return { value, price, name, rate };
  }

  fetch(code) {
    if (Array.isArray(code)) return Promise.all(code.map(c => this.fetch(c)));
    const uri = url.replace(/{{code}}/, code);
    return fetch(uri)
    .then(res => res.text())
    .then(data => new JSDOM(data).window.document)
    .then(document => this.scraping(document))
    .then(res => {
      const { value, price, name, rate } = res;
      return `${value}  |  ${price}  |  ${rate}  |  <${uri}|${name}  ${code}>`;
    });
  }
}

module.exports = {
  Kabuka,
  kabuka: new Kabuka(),
};
