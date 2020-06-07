'use strict'
let scholar = require('google-scholar-extended')

scholar.profile('PL1YL-MAAAAJ')
  .then(resultsObj => {
    console.log(resultsObj)
  })