class Bar {}

class Foo extends Bar {
  constructor() {
    if (eval("false")) super();
  }
}

expect(() => new Foo()).toThrow("this is not defined");
