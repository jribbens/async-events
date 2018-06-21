'use strict'

const EventEmitter = require('events')

class AsyncEventEmitter extends EventEmitter {
  async emit (type, ...args) {
    const parallel = (typeof type === 'string') && type[0] === '='
    if (parallel) type = type.substr(1)
    const listeners = this._events ? this._events[type] : undefined
    if (!listeners) {
      if (type === 'error') super.emit(type, ...args)
      return false
    }
    if (typeof listeners === 'function') {
      await Reflect.apply(listeners, this, args)
    } else {
      if (parallel) {
        const promises = []
        var error
        for (const handler of listeners.slice()) {
          try {
            const value = Reflect.apply(handler, this, args)
            if (value instanceof Promise) {
              promises.push(value.catch(reason => {
                if (error === undefined) error = reason
              }))
            }
          } catch (exc) {
            if (error === undefined) error = exc
            break
          }
        }
        await Promise.all(promises)
        if (error !== undefined) throw error
      } else {
        for (const handler of listeners.slice()) {
          await Reflect.apply(handler, this, args)
        }
      }
    }
    return true
  }

  once (type, listener) {
    if (typeof listener !== 'function') return super.once(type, listener)
    return this.on(type, _onceWrap(this, type, listener))
  }

  prependOnceListener (type, listener) {
    if (typeof listener !== 'function') {
      return super.prependOnceListener(type, listener)
    }
    return this.prependListener(type, _onceWrap(this, type, listener))
  }
}

function _onceWrap (target, type, listener) {
  const state = { fired: false, wrapFn: undefined, target, type, listener }
  const wrapped = _onceWrapper.bind(state)
  wrapped.listener = listener
  state.wrapFn = wrapped
  return wrapped
}

function _onceWrapper (...args) {
  if (!this.fired) {
    this.target.removeListener(this.type, this.wrapFn)
    this.fired = true
    return Reflect.apply(this.listener, this.target, args)
  }
}

module.exports = AsyncEventEmitter
