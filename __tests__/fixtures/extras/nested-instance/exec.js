class Foo {
  test() {
    return Math.PI
  }
}

const a = {
  b: {
    c: {}
  }
}

// nesting directly
a.foo = new Foo()
expect(a.foo.test()).toBe(Math.PI)
a.foo = null

// tainting via full path
a.b.c.d = new Foo()
expect(a.b.c.d.test()).toBe(Math.PI)
a.b.c.d = null
expect(a.b.c.d).toBe(null)

// tainting via separate identifier
const c = a.b.c
c.d = new Foo()
expect(c.d.test()).toBe(Math.PI)
expect(a.b.c.d.test()).toBe(Math.PI)
c.d = null
