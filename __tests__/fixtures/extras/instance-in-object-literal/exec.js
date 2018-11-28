class Foo {
  test() {
    return Math.PI
  }
}

const a = {
  b: {
    c: {
      d: new Foo()
    }
  }
}

expect(a.b.c.d.test()).toBe(Math.PI)
