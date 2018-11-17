class Foo {
  constructor() {
    this.key = 'value'
  }

  method() {
    return 'test'
  }
}

expect(new Foo().method()).toBe('test')
expect(new Foo().key).toBe('value')
