/**
 * @file tests/index.js
 * @copyright 2018-present Karim Alibhai. All rights reserved.
 */

const fs = require('fs')
const vm = require('vm')
const glob = require('glob')

const { transform } = require('./helpers')

const isBenchmark = process.env.NODE_ENV === 'benchmark'
const fixturesPath = isBenchmark ? `${__dirname}/benchmarks` : `${__dirname}/fixtures`

function createTest(name, method) {
  if (isBenchmark) {
    suite(name, () => {
      bench(`${name} (input)`, method(false))
      bench(`${name} (output)`, method(true))
    })
  } else {
    test(`${name} (input)`, method(false))
    test(`${name} (output)`, method(true))
  }
}

for (const file of glob.sync(`${fixturesPath}/**/*.js`)) {
  if (process.env.FILTER && !file.includes(`/${process.env.FILTER}/`)) {
    continue
  }

  createTest(
    file.substr(fixturesPath.length + 1, file.length - 3),
    shouldTransform => {
      const data = fs.readFileSync(file, 'utf8')
      const expect = global.expect || function() {
        return {
          toBe() {},
        }
      }
      const sandbox = vm.createContext({
        babelHelpers: {},
        expect,
        exports: () => { throw new Error('Did not export anything') },
      })

      const src = transform(`
      exports = function(){
        ${data}
      }
      `, shouldTransform, isBenchmark)

      vm.runInContext(src, sandbox, {
        filename: file,
      })

      return sandbox.exports
    }
  )
}
