scholar = require('./src/utils/scholar')
let cheerioObject = require("fetch-cheerio-object");


function loadCheerio(html) {
      cheerioObject(html).then(($) => {
          console.log($)
        const websiteTitle = $(".gsc_vcd_title_link");
        console.log("Title: ", websiteTitle.text());
      });
}


(async () => {
    console.log('hola')
    const $ = await cheerioObject('https://scholar.google.cl/citations?view_op=view_citation&hl=es&user=PL1YL-MAAAAJ&citation_for_view=PL1YL-MAAAAJ:d1gkVwhDpl0C');
    console.log($('.gsc_vcd_title a').html()); 
  })();
//loadCheerio("https://scholar.google.cl/citations?view_op=view_citation&hl=es&user=PL1YL-MAAAAJ&citation_for_view=PL1YL-MAAAAJ:d1gkVwhDpl0C");