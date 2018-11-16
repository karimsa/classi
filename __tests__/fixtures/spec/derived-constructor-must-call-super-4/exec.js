class Bar {}

class Foo extends Bar {
  constructor() {
    const fn = () => super();
  }
}

expect(() => new Foo()).toThrow("this is not defined");
