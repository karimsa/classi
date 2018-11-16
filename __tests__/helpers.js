/**
 * @file tests/helpers.js
 * @copyright 2018-present Karim Alibhai. All rights reserved.
 */

const babel = require('@babel/core')

exports.transform = function transform(code) {
  return babel.transform(code, {
    babelrc: false,
    plugins: [require('../')],
  }).code
}
