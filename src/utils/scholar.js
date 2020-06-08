"use strict";
let fetch = require("node-fetch");
let request = require("request");
let requeest = require("request-promise");
let cheerio = require("cheerio");
let striptags = require("striptags");
let cheerioObject = require("fetch-cheerio-object");
const throttledQueue = require("throttled-queue");

function loadCheerio(html) {
    perSecThrottle(() => {
      fetchCheerioObject("https://example.org/").then(($) => {
        const websiteTitle = $(".gsc_vcd_title a");
        console.log("Title: ", websiteTitle.html());
      });
    });
}
let scholar = (function () {
  // 1 per 200 ms ~= 5/s per
  // https://developers.google.com/webmaster-tools/search-console-api-original/v3/limits

  const perSecThrottle = throttledQueue(1, 5000);
  const perMinThrottle = throttledQueue(200, 60 * 1000);
  const RESULTS_PER_PAGE = 10;

  const GOOGLE_SCHOLAR_URL = "https://scholar.google.com/scholar?hl=en&q=";
  const GOOGLE_SCHOLAR_PROFILE_URL =
    "https://scholar.google.co.uk/citations?hl=en&user=";
  const GOOGLE_SCHOLAR_URL_PREFIX = "https://scholar.google.com";

  const ELLIPSIS = "...";
  const ELLIPSIS_HTML_ENTITY = "&#x2026;";
  const COMMA = ",";
  const COMMA_HTML_ENTITY = "&#xFFFD;";
  const ET_AL_NAME = "et al.";
  const CITATION_COUNT_PREFIX = "Cited by ";
  const RELATED_ARTICLES_PREFIX = "Related articles";

  const STATUS_CODE_FOR_RATE_LIMIT = 503;
  const STATUS_MESSAGE_FOR_RATE_LIMIT = "Service Unavailable";
  const STATUS_MESSAGE_BODY =
    'This page appears when Google automatically detects requests coming from your computer network which appear to be in violation of the <a href="//www.google.com/policies/terms/">Terms of Service</a>. The block will expire shortly after those requests stop.';

  // regex with thanks to http://stackoverflow.com/a/5917250/1449799
  const RESULT_COUNT_RE = /\W*((\d+|\d{1,3}(,\d{3})*)(\.\d+)?) results/;


  function responseAction(reject,error, response, html, callback) {
    if (error) {
      Promise.reject(error);
    } else if (response.statusCode !== 200) {
      if (
        response.statusCode === STATUS_CODE_FOR_RATE_LIMIT &&
        response.statusMessage === STATUS_MESSAGE_FOR_RATE_LIMIT &&
        response.body.indexOf(STATUS_MESSAGE_BODY) > -1
      ) {
          reject('mala tu wea')
        Promise.reject(
          new Error(
            "you are being rate-limited by google. you have made too many requests too quickly. see: https://support.google.com/websearch/answer/86640"
          )
        );
      } else {
          reject('mala tu wea')
        Promise.reject(
          new Error(
            "expected statusCode 200 on http response, but got: " +
              response.statusCode
          )
        );
      }
    } else {
      callback(html);
    }
  }

  function removeFromEnd(string, remove, callback) {
    if (string.substr(string.length - remove.length) === remove) {
      callback(true, string.substr(0, string.length - remove.length));
    } else {
      callback(false, string);
    }
  }

  function removeFromBeginning(string, remove, callback) {
    if (string.substr(0, remove.length) === remove) {
      callback(true, string.substr(remove.length + 2));
    } else {
      callback(false, string);
    }
  }

  function scholarResultsCallback(
    resolve,
    reject,
    RESULTS_TAG,
    TITLE_TAG,
    URL_TAG,
    AUTHOR_NAMES_TAG,
    FOOTER_LINKS_TAG
  ) {
    return (error, response, html) => {
      responseAction(reject ,error, response, html, (html) => {
        let $ = cheerio.load(html);

        let results = $(RESULTS_TAG);
        let resultCount = 0;

        let processedResults = [];
        results.each((i, r) => {
          let title = $(r).find(TITLE_TAG).text().trim();
          let url = $(r).find(URL_TAG).attr("href");
          let authorNamesHTMLString = $(r).find(AUTHOR_NAMES_TAG).html();
          let etAl = false;
          let etAlBegin = false;
          let authors = [];
          let footerLinks = $(r).find(FOOTER_LINKS_TAG);
          let citedCount = 0;
          let relatedUrl =
            GOOGLE_SCHOLAR_URL_PREFIX + $(r).find(TITLE_TAG).attr("data-href");
          let pdfUrl = $($(r).find(".gs_ggsd a")[0]).attr("href");
          let year = "";
          let book = "";
          let conference = "";
          let journal = "";
          let pages = "";
          let volume = "";
          let issue = "";

          // Profile specific
          $(r).find(".gs_gray").last().find(".gs_oph").remove();
          let venueHTMLString = $(r).find(".gs_gray").last().html();
          let venue;

          if (relatedUrl) {
           // loadCheerio(relatedUrl);

            let temporal = cheerio.load(relatedUrl.toString());
            let temporal_results = temporal(".gsc_vcd_table");
            temporal_results.each((i, r) => {
              console.log("hola");
              if (
                temporal_results(".gs_scl .gsc_vcd_field").text() ===
                "Fecha de publicación"
              ) {
                year = "hola";
              }
            });
          }
          if ($(footerLinks[0]).text().indexOf(CITATION_COUNT_PREFIX) >= 0) {
            citedCount = $(footerLinks[0])
              .text()
              .substr(CITATION_COUNT_PREFIX.length);
          }

          if (footerLinks && footerLinks.length && footerLinks.length > 0) {
            // Relax restrictions as no 'Cited by' prefix on author page.
            citedCount = $(footerLinks[0]).text();
            if (
              $(footerLinks[0]).text &&
              $(footerLinks[0]).text().indexOf(CITATION_COUNT_PREFIX) >= 0
            ) {
              citedCount = $(footerLinks[0])
                .text()
                .substr(CITATION_COUNT_PREFIX.length);
            }
          }
          if (authorNamesHTMLString) {
            let cleanString = authorNamesHTMLString;

            // Check also for non-HTML ellipsis.
            removeFromEnd(
              cleanString,
              ELLIPSIS_HTML_ENTITY,
              (resultA, stringA) => {
                removeFromEnd(cleanString, ELLIPSIS, (resultB, stringB) => {
                  if (resultA) {
                    cleanString = stringA;
                  } else if (resultB) {
                    cleanString = stringB;
                  } else if (resultA || resultB) {
                    etAl = true;
                  }
                });
              }
            );

            removeFromBeginning(
              cleanString,
              ELLIPSIS_HTML_ENTITY,
              (resultA, stringA) => {
                removeFromBeginning(
                  cleanString,
                  ELLIPSIS,
                  (resultB, stringB) => {
                    if (resultA) {
                      cleanString = stringA;
                    } else if (resultB) {
                      cleanString = stringB;
                    } else if (resultA || resultB) {
                      etAlBegin = true;
                    }
                  }
                );
              }
            );

            let htmlAuthorNames = cleanString.split(", ");
            if (etAl) {
              htmlAuthorNames.push(ET_AL_NAME);
            }
            if (etAlBegin) {
              htmlAuthorNames.unshift(ET_AL_NAME);
            }
            authors = htmlAuthorNames.map((name) => {
              let tmp = cheerio.load(name);
              let authorObj = {
                name: "",
                url: "",
              };
              if (tmp("a").length === 0) {
                authorObj.name = striptags(name);
              } else {
                authorObj.name = tmp("a").text();
                authorObj.url =
                  GOOGLE_SCHOLAR_URL_PREFIX + tmp("a").attr("href");
              }
              return authorObj;
            });
          }

          // Profile specific.
          if (venueHTMLString) {
            venue = venueHTMLString;

            removeFromEnd(venue, ELLIPSIS_HTML_ENTITY, function (
              resultA,
              stringA
            ) {
              removeFromEnd(venue, ELLIPSIS, function (resultB, stringB) {
                if (resultA) {
                  venue = stringA;
                } else if (resultB) {
                  venue = stringB;
                }
                removeFromEnd(venue, COMMA_HTML_ENTITY, function (
                  resultC,
                  stringC
                ) {
                  removeFromEnd(venue, COMMA, function (resultD, stringD) {
                    if (resultC) {
                      venue = stringC;
                    } else if (resultD) {
                      venue = stringD;
                    }
                  });
                });
              });
            });
          }

          processedResults.push({
            title: title,
            url: url,
            authors: authors,
            citedCount: citedCount,
            relatedUrl: relatedUrl,
            pdf: pdfUrl,
            year: year,
            venue: venue,
          });
        });

        let resultsCountString = $("#gs_ab_md").text();
        if (resultsCountString && resultsCountString.trim().length > 0) {
          let matches = RESULT_COUNT_RE.exec(resultsCountString);
          if (matches && matches.length > 0) {
            resultCount = parseInt(matches[1].replace(/,/g, ""));
          } else {
            resultCount = processedResults.length;
          }
        } else {
          resultCount = processedResults.length;
        }
        reject()
        resolve({
          results: processedResults,
          count: resultCount,
        });
      });
    };
  }

  function profile(id) {
    let p = new Promise(function (resolve, reject) {
      var requestOptions = {
        jar: true,
      };
      requestOptions.url = encodeURI(GOOGLE_SCHOLAR_PROFILE_URL + id);
      request(
        requestOptions,
        scholarResultsCallback(
          resolve,
          reject,
          ".gsc_a_tr",
          ".gsc_a_t a",
          ".gs_ri h3 a",
          ".gs_gray",
          ".gsc_a_c a"
        )
      );
    });
    return p;
  }
  return {
    profile: profile,
  };
})();

module.exports = scholar;
