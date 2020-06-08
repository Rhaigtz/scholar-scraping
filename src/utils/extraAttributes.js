const request = require('request-promise');
const cheerio = require('cheerio');

const fs = require('fs-extra');
const writeStream = fs.createWriteStream('quotes.csv');

async function  init(){
    try {
        // const response = await request('http://quotes.toscrape.com/');
        const $ = await request({
            uri: 'http://quotes.toscrape.com/',
            transform: body => cheerio.load(body)
        });

        const websiteTitle = $('title');
        console.log('Title: ', websiteTitle.html());

        const webSiteHeading = $('h1')
        console.log('Heading: ', webSiteHeading.text().trim());

        const quote = $('.quote').find('a');
        console.log(quote.html());

        const third_quote = $('.quote').next().next();
        // console.log(third_quote.html())

        // Parent
        const containerClass = $('.row.header-box');
        // console.log(containerClass.parent().html())

        // $('.quote span.text').each((i, el) => {
        //     const quote_text = $(el).text();
        //     const quote = quote_text.replace(/(^\“|\”$)/g, "");
        // })        

        writeStream.write('Quote|Author|Tags\n');
        const tags = [];
        $('.quote').each((i, el) => {
            const text = $(el).find('span.text').text().replace(/(^\“|\”$)/g, "");
            const author = $(el).find('span small.author').text();
            const tag = $(el).find('.tags a').html();
            tags.push(tag);
            // console.log(text, author, tags.join(','))
            writeStream.write(`${text}|${author}|${tags}\n`);
            // console.log(i, text, author)
        })

        console.log('Done.');
        // $('.quote .tags a').each((i, el) => {
        //     // console.log($(el).html())
        //     const text = $(el).text();
        //     const link = $(el).attr('href');
        //     console.log(text, link)
        // });

    } catch (e) {
        console.log(e);
    }
}

module.export = { init }