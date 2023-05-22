const { fetch } = require('@jobscale/fetch');
const { JSDOM } = require('jsdom');

const url = 'https://finance.yahoo.co.jp/quote/{{code}}';

class Kabuka {
  fetch(code) {
    if (Array.isArray(code)) return Promise.all(code.map(c => this.fetch(c)));
    const uri = url.replace(/{{code}}/, code);
    return fetch.get(uri)
    .then(res => new JSDOM(res.data).window.document)
    .then(document => {
      const main = document.querySelector('#root > main > div > div > div');
      const section = main.querySelector('section');
      section.querySelector('div').remove();
      const value = section.querySelector('div:nth-child(3) > div:nth-child(2)').textContent;
      const header = section.querySelector('header');
      const name = header.querySelector('div:nth-child(1)').textContent;
      const price = header.querySelector('div:nth-child(2)').textContent;
      return `${value}  |  ${price}  |  <${uri}|${name}  ${code}>`;
    });
  }
}

module.exports = {
  Kabuka,
  kabuka: new Kabuka(),
};
