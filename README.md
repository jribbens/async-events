# Async events framework

This is a simple library to extend the standard `events` module so that
it can cope with asynchronous event listeners. It requires ES6 Promises
and `async` functions. The standard EventEmitter methods are all
supported, including 'once' and 'prepend' listeners. 


## Serial execution

`AsyncEventEmitter.emit()` guarantees that all of the listeners will be
called in the correct order. If a listener returns a Promise (e.g.
because it is an `async` function) then `emit` will wait for the promise
to resolve before any further listeners are called. Any other type of
value returned from a listener will be ignored (so standard synchronous
listeners will still work properly).

The return value from `emit()` is a Promise that will be resolved when
all the listeners have been called. If there were no listeners then it
will resolve to `false`, otherwise it will resolve to `true`. If any
listener throws or returns a Promise that rejects, the `emit` Promise
will immediately be rejected with that value.

As with the standard `EventEmitter`, `emit` will reject if an event
called `error` is emitted and there are no listeners for it.


## Parallel execution

Normally the listeners are executed in a serial manner, as described
above. They can however be executed in a parallel fashion by prefixing
the event type with `=`.

Unlike `Promise.all`-style execution, parallel `emit` will not return
until all the promises that were started have been fulfilled or
rejected. All the listeners will be started in order; if any throw
a synchronous exception then no later listeners will be started.
When all listeners have completed, if any threw exceptions or
returned Promises that rejected, the Promise returned by `emit`
will be rejected as well, with the value of whatever exception or
rejection came first.

To clarify, if we have four listeners:

    ok1 = () => new Promise(resolve => setTimeout(resolve, 100))
    ok2 = () => new Promise(resolve => setTimeout(resolve, 100))
    thrower = () => { throw new Error('throw') }
    rejecter = () => Promise.reject(new Error('reject'))

and we emit an event with listeners `[ok1, thrower, ok2]`,
`ok1` will run to completion, `ok2` will not be called at all,
and `emit` will reject with `Error('throw')` after `ok1` has
completed.

If we emit an event with listeners `[ok1, rejecter, ok2]`,
both `ok1` and `ok2` will run to completion, and `emit` will
reject with `Error('reject')` after both `ok1` and `ok2` have
completed.


## Usage

    const AsyncEventEmitter = require('async-events')

    class Foo extends AsyncEventEmitter {
      ...
    }

    const emitter = new Foo()
    emitter.on('test', async function () { ... })
    emitter.on('test', function () { ... })
    await emitter.emit('test')  // process listeners in series
    await emitter.emit('=test')  // process listeners in parallel 


## History

### 1.0.0 (2018-06-20)

  * Initial release
