/**
 * @file tests/helpers.js
 * @copyright 2018-present Karim Alibhai. All rights reserved.
 */

const babel = require('@babel/core')

exports.transform = function transform(code, transform = false, minify = false) {
  const output = babel.transform(code, {
    babelrc: false,
    presets: minify ? ['minify'] : [],
    plugins: transform ? [require('../')] : [],
  }).code
  // console.log(output)
  return output
}
