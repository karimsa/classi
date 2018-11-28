class Bar {
  pi() {
    return Math.PI
  }
}

class Foo {
  constructor() {
    this.bar = new Bar()
  }

  twoPi() {
    const b = this.bar
    return b.pi() * 2
  }
}

expect(new Bar().pi()).toBe(Math.PI)
expect(new Foo().twoPi()).toBe(2 * Math.PI)
