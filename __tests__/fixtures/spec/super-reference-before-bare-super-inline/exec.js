class Bar {}

class Foo extends Bar {
  constructor() {
    super.foo(super());
  }
}

expect(() => new Foo()).toThrow("this is not defined");
