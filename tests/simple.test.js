/**
 * @file tests/simple.test.js
 * @copyright 2018-present Karim Alibhai. All rights reserved.
 */

const { test } = require('ava')

const { transform } = require('./helpers')

test(t => eval(transform(`
  class Hero {
    sayHello(name) {
      return 'Hello, I am ' + name
    }
  }

  const h = new Hero()
  t.is(h.sayHello('batman'), 'Hello, I am batman')
`)))

test(t => eval(transform(`
  class Hero {
    constructor(name) {
      this.name = name
    }

    sayHello() {
      return 'Hello, I am ' + this.name
    }
  }

  const h = new Hero('batman')
  t.is(h.sayHello('batman'), 'Hello, I am batman')
`)))
