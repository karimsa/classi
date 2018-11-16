
/**
 * @file src/index.ts
 * @copyright 2018-present Karim Alibhai. All rights reserved.
 */

import template from '@babel/template'
import { NodePath, Visitor, Binding } from '@babel/traverse'
import {
  Node,
  ClassDeclaration,
  Identifier,
  LVal,
  isIdentifier,
  isClassMethod,
  isNewExpression,
  Expression,
  MemberExpression,
  identifier,
  stringLiteral,
  ClassMethod,
  Statement,
  cloneDeep,
} from '@babel/types'

const getInstanceMethodName = (className: string, method: string) => `_${className}__${method}`
const getStaticMethodName = (className: string, method: string) => `_static_${className}__${method}`

type Template<T> = (arg: T) => Node[]

function tpl<T>(src: string) {
  const t = template(src)
  return function(arg: T) {
    const compiled = t(arg)
    if (Array.isArray(compiled)) {
      return compiled
    }

    return [compiled]
  }
}

const propertyGet = tpl(`
  INSTANCE.get(PROPERTY)
`) as Template<{
  INSTANCE: Identifier
  PROPERTY: Expression
}>

const propertySet = tpl(`
  INSTANCE.set(PROPERTY, VALUE)
`) as Template<{
  INSTANCE: Identifier
  PROPERTY: Expression
  VALUE: Expression
}>

const createEmptyConstructor = tpl(`
function CONSTRUCTOR() {
  return new Map()
}
`) as Template<{
  CONSTRUCTOR: Identifier
}>

const createConstructorFromInit = tpl(`
function INIT_NAME(THIS, INIT_ARGS) {
  INIT_BODY
}

function CONSTRUCTOR(INIT_ARGS) {
  const map = new Map()
  INIT_NAME(map, INIT_ARGS)
  return map
}
`) as Template<{
  INIT_NAME: Identifier
  THIS: Identifier
  INIT_ARGS: LVal[]
  INIT_BODY: Statement[]
  CONSTRUCTOR: Identifier
}>

const fnDeclaration = tpl(`
function METHOD(THIS, ARGS) {
  BODY
}
`) as Template<{
  METHOD: Identifier
  THIS: Identifier
  ARGS: LVal[]
  BODY: Statement[]
}>

const newExpr = tpl(`
  CONSTRUCTOR(ARGS)
`) as Template<{
  CONSTRUCTOR: Identifier
  ARGS: Expression[]
}>

const methodCall = tpl(`
  METHOD(THIS, ARGS)
`) as Template<{
  METHOD: Identifier
  THIS: Identifier
  ARGS: Expression[]
}>

interface Context {
  constructorName: Identifier
  methods: Map<string, Identifier>
}

declare const console: {
  log: (... args: any[]) => void
}

function replaceThisBinding(path: NodePath<any>, THIS: Identifier): Identifier {
  path.traverse({
    ThisExpression(thisPath) {
      thisPath.replaceWith(THIS)
    },

    FunctionDeclaration(child) {
      child.skip()
    },
    FunctionExpression(child) {
      child.skip()
    },
    ClassProperty(child) {
      if (!child.node.static) {
        child.skip()
      }
    },
  })

  return THIS
}

export default function classi(): { visitor: Visitor } {
  const contexts = new Map<Binding, Context>()
  const bindingToClass = new Map<Binding, Context>()

  function createContext(binding: Binding, ctx: Context) {
    contexts.set(binding, ctx)
  }

  function getContext(binding: Binding | undefined) {
    return binding ? contexts.get(binding) : null
  }

  function markTainted(binding: Binding, ctx: Context) {
    bindingToClass.set(binding, ctx)
  }

  return {
    visitor: {
      Identifier: {
        enter (path: NodePath<Identifier>) {
          const binding = path.scope.getBinding(path.node.name)
          const ctx = getContext(binding)

          if (ctx) {
            if (isNewExpression(path.parent)) {
              path.parentPath.replaceWithMultiple(newExpr({
                CONSTRUCTOR: ctx.constructorName,
                ARGS: path.parent.arguments as Expression[],
              }))

              switch (path.parentPath.parent.type) {
                case 'AssignmentExpression': // f = new Hero()
                case 'VariableDeclarator': { // let f = new Hero()
                  const parent = path.parentPath.parent
                  const lval = parent.type === 'AssignmentExpression' ? parent.left : parent.id
                  if (!lval) {
                    throw new Error(`Unexpected LVal of type null`)
                  }

                  if (isIdentifier(lval)) {
                    const refBinding = path.parentPath.parentPath.scope.getBinding(lval.name)
                    if (!refBinding) {
                      throw new Error(`Failed to find a binding for: ${lval.name} in ${parent.type}`)
                    }

                    markTainted(refBinding, ctx)
                  } else {
                    throw new Error(`Cannot handle an LVal of type: ${lval.type}`)
                  }
                  break
                }

                default:
                  throw new Error(`Unknown parent type: ${path.parentPath.parent.type}`)
              }
            }
          }
        },
      },

      MemberExpression: {
        exit(path: NodePath<MemberExpression>) {
          if (isIdentifier(path.node.object)) {
            const objectName = path.node.object.name
            const property = path.node.property as Expression

            switch (property.type) {
              case 'Identifier': {
                const propertyName = property.name
                const binding = path.scope.getBinding(objectName)

                if (binding) {
                  const bindingInfo = bindingToClass.get(binding)

                  if (bindingInfo) {
                    const { methods } = bindingInfo
                    const methodTransl = methods.get(propertyName)

                    if (methodTransl) {
                      if (path.parent.type === 'CallExpression') {
                        path.parentPath.replaceWithMultiple(methodCall({
                          METHOD: methodTransl,
                          THIS: path.node.object,
                          ARGS: path.parent.arguments as Expression[],
                        }))
                      } else {
                        throw new Error(`Unexpected parent of method memeber: ${path.parent.type}`)
                      }
                    } else if (path.parent.type === 'AssignmentExpression' && path.parent.left === path.node) {
                      const nodes = propertySet({
                        INSTANCE: identifier(objectName),
                        PROPERTY: stringLiteral(propertyName),
                        VALUE: path.parent.right,
                      })

                      const setPath = path.parentPath.insertBefore(nodes)[0] as NodePath<any>
                      setPath.skip()

                      path.parentPath.remove()
                    } else {
                      path.replaceWithMultiple(propertyGet({
                        INSTANCE: identifier(objectName),
                        PROPERTY: stringLiteral(propertyName),
                      }))
                      path.skip()
                    }
                  }
                }
              } break

              default:
                throw new Error(`Cannot handle member expression property of type: ${property.type}`)
            }
          }
        },
      },

      ClassDeclaration: {
        enter(path: NodePath<ClassDeclaration>): void {
          if (!path.node.id || !isIdentifier(path.node.id)) {
            return
          }
          
          function declareMethod(type: 'static' | 'instance', name: string) {
            if (!path.node.id) {
              throw new Error(`Impossible path reached`)
            }

            return path.scope.generateUidIdentifier(
              type === 'instance' ?
                getInstanceMethodName(path.node.id.name, name) :
                getStaticMethodName(path.node.id.name, name)
            )
          }

          let hasGeneratedConstructor = false
          const CONSTRUCTOR = declareMethod('instance', 'constructor')
          // const container: Node[] = []

          const ctx: Context = {
            constructorName: CONSTRUCTOR,
            methods: new Map(),
          }

          // for (const method of path.node.body.body) {
          for (let i = 0; i < path.node.body.body.length; ++i) {
            const method = path.node.body.body[i]
            const methodPath = (path.get('body.body') as NodePath<ClassMethod>[])[i]
            if (!methodPath) {
              throw new Error(`Failed to find method at path: body.body[${i}]`)
            }

            if (isClassMethod(method)) {
              if (isIdentifier(method.key)) {
                if (method.key.name === 'constructor') {
                  hasGeneratedConstructor = true
                  const constructorBody = (methodPath.get('body.body') as any || [])[0] as NodePath<any> | void
                  if (!constructorBody) {
                    throw new Error(`Unexpected path retrieved for constructor body`)
                  }

                  const THIS = methodPath.scope.generateUidIdentifier('__$this')
                  const constructorPaths = path.insertBefore(createConstructorFromInit({
                    CONSTRUCTOR,
                    INIT_NAME: declareMethod('instance', 'init'),
                    THIS,
                    INIT_ARGS: method.params.map(n => cloneDeep(n)),
                    INIT_BODY: method.body.body.map(n => cloneDeep(n)),
                  })) as NodePath<any>[]

                  const initPath = constructorPaths[0]
                  if (!initPath) {
                    throw new Error(`Failed to insert constructor + init`)
                  }

                  replaceThisBinding(initPath, THIS)

                  const thisBinding = initPath.scope.getBinding(THIS.name)
                  if (!thisBinding) {
                    throw new Error(`Failed to find a this binding in constructor after replacement`)
                  }

                  markTainted(thisBinding, ctx)
                } else {
                  const bodyPath = methodPath.get('body')
                  if (!bodyPath) {
                    throw new Error(`Failed to grab the path of the method body for: ${method.key.name}`)
                  }

                  const THIS = methodPath.scope.generateUidIdentifier('__$this')

                  const METHOD = declareMethod('instance', method.key.name)
                  ctx.methods.set(method.key.name, METHOD)

                  const fnPath = path.insertAfter(fnDeclaration({
                    METHOD,
                    THIS,
                    ARGS: method.params.map(n => cloneDeep(n)),
                    BODY: method.body.body.map(n => cloneDeep(n)),
                  }))[0] as NodePath<any>
                  if (!fnPath) {
                    throw new Error(`Failed to insert function declaration`)
                  }

                  replaceThisBinding(fnPath, THIS)

                  const thisBinding = fnPath.scope.getBinding(THIS.name)
                  if (!thisBinding) {
                    throw new Error(`Failed to locate binding for "${THIS.name}" in function declaration`)
                  }

                  markTainted(thisBinding, ctx)
                }
              }
            }
          }

          if (!hasGeneratedConstructor) {
            path.insertAfter(createEmptyConstructor({
              CONSTRUCTOR,
            }))
          }

          const refName = path.node.id.name
          const binding = path.scope.getBinding(refName)
          if (!binding) {
            throw new Error(`Failed to find binding for: "${refName}"`)
          }

          createContext(binding, ctx)
        },
      },
    },
  }
}
