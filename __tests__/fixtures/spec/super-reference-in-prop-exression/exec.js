let called = false;

class A {
  method() {
    called = true;
  }

  get methodName() {
    return "method";
  }
}

class B extends A {
  constructor() {
    let f = super().methodName;
    super[f]();
  }
}

new B();
new A();
expect(called).toBe(true);
