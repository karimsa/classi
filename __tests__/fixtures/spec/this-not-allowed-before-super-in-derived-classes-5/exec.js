class Bar {}

class Foo extends Bar {
  constructor() {
    Foo[this];
  }
}

expect(() => new Foo()).toThrow("this is not defined");
