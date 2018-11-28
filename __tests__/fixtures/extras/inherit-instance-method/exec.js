class Bar {
  pi() {
    return Math.PI
  }
}

class Foo extends Bar {
  twoPi() {
    return this.pi() * 2
  }
}

expect(new Bar().pi()).toBe(Math.PI)
expect(new Foo().twoPi()).toBe(2 * Math.PI)
