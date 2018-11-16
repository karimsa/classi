class Bar {
  test() {}
}

class Foo extends Bar {
  constructor() {
    const t = () => super.test()
    t();
    super();
  }
}

expect(() => new Foo()).toThrow("this is not defined");
