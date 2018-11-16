/**
 * @file tests/index.js
 * @copyright 2018-present Karim Alibhai. All rights reserved.
 */

const fs = require('fs')
const vm = require('vm')
const glob = require('glob')

const { transform } = require('./helpers')

const fixturesPath = `${__dirname}/fixtures`

for (const file of glob.sync(`${fixturesPath}/**/*.js`)) {
  if (!file.includes('/nested-class-super-call-in-key/')) {
    continue
  }

  test(
    file.substr(fixturesPath.length + 1, file.length - 3),
    _done => {
      let src
      function done(err) {
        if (err && src) {
          console.log(src)
        }

        _done(err)
      }

      fs.readFile(file, 'utf8', (err, data) => {
        if (err) done(err)
        else {
          try {
            const sandbox = vm.createContext({
              babelHelpers: {},
              expect,
            })

            src = `
            (function(){
              ${transform(data)}
            }())
            `

            vm.runInContext(src, sandbox, {
              filename: file,
            })

            done(null)
          } catch (err) {
            done(err)
          }
        }
      })
    }
  )
}
