function createFoo() {
  class Bar {
      sayHello() {
          return 'hello';
      }
  }

  const foo = new Bar();
  foo.sayHello();
  return foo;
}

createFoo().sayHello();
