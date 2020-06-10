scholar = require('./src/utils/scholar');
let cheerioObject = require('fetch-cheerio-object');

const loadCheerio = async (html, beforeData) => {
  const $ = await cheerioObject(html);
  let year = '';
  let book = '';
  let conference = '';
  let journal = '';
  let pages = '';
  let volume = '';
  let issue = '';
  let autors = '';
  $('.gs_scl').each((i, r) => {
    if ($(r).find('.gsc_vcd_field').text() === 'Fecha de publicación') {
      year = $(r).find('.gsc_vcd_value').text();
    }
    if ($(r).find('.gsc_vcd_field').text() === 'Libro') {
      book = $(r).find('.gsc_vcd_value').text();
    }
    if ($(r).find('.gsc_vcd_field').text() === 'Revista') {
      journal = $(r).find('.gsc_vcd_value').text();
    }
    if ($(r).find('.gsc_vcd_field').text() === 'Conferencia') {
      conference = $(r).find('.gsc_vcd_value').text();
    }
    if ($(r).find('.gsc_vcd_field').text() === 'Volumen') {
      volume = $(r).find('.gsc_vcd_value').text();
    }
    if ($(r).find('.gsc_vcd_field').text() === 'Páginas') {
      pages = $(r).find('.gsc_vcd_value').text();
    }
    if ($(r).find('.gsc_vcd_field').text() === 'Número') {
      issue = $(r).find('.gsc_vcd_value').text();
    }
    if ($(r).find('.gsc_vcd_field').text() === 'Autores') {
      autors = $(r).find('.gsc_vcd_value').text();
    }
  });
  return {
    ...beforeData,
    year,
    book,
    journal,
    conference,
    pages,
    issue,
    autors,
  };
};

scholar
  .profile('PL1YL-MAAAAJ')
  .then((response) => {
    console.log(response.results);
    return response.results;
  })
  .then((listData) => {
    Promise.all(
      listData.map((item) => {
        console.log('item ', item);
        return loadCheerio(item.relatedUrl, item);
      })
    ).then((response) => console.log('finalResponse', response));
  });
