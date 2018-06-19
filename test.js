'use strict'

/* global describe, it */

const { expect, use } = require('chai')
use(require('chai-as-promised'))

const AsyncEventEmitter = require('./async-events')

describe('async-events.js', function () {
  this.slow(200)

  async function testEmit (listeners, repeat) {
    var results

    function listener (delay, result) {
      return async function () {
        await new Promise(resolve => setTimeout(resolve, delay))
        results += result
      }
    }

    const e = new AsyncEventEmitter()
    var event = 't'
    e.thing = 'T'
    for (const l of listeners) {
      if (l === 'A') e.addListener('t', listener(10, 'A'))
      else if (l === 'B') e.on('t', listener(5, 'B'))
      else if (l === 'a') e.prependListener('t', listener(10, 'a'))
      else if (l === 'b') e.prependListener('t', listener(5, 'b'))
      else if (l === 'I') e.on('t', () => { results += 'I' })
      else if (l === 'O') e.once('t', listener(15, 'O'))
      else if (l === 'o') e.prependOnceListener('t', listener(15, 'o'))
      else if (l === 'P') e.on('t', p => { results += p })
      else if (l === 'R') e.on('t', () => Promise.reject(new Error('!!!')))
      else if (l === 'T') e.on('t', function () { results += this.thing })
      else if (l === 'X') e.on('t', () => { throw new Error('!!!') })
      else if (l === '=') event = '=t'
      else throw new Error(`Unknown listener code '${l}'`)
    }
    results = ''
    try {
      await e.emit(event, 'P')
      if (repeat) {
        results += ':'
        await e.emit(event, 'P')
      }
      return results
    } catch (error) {
      if (error.message === '!!!') error.message = results
      throw error
    }
  }

  describe('emit return value', function () {
    it('should be a Promise', function () {
      return expect(new AsyncEventEmitter().emit('test'))
        .to.be.an.instanceof(Promise)
    })

    it('should resolve to false if there are no listeners', function () {
      return expect(new AsyncEventEmitter().emit('test'))
        .to.eventually.be.false
    })

    it('should resolve to true if there is a listener', function () {
      const emitter = new AsyncEventEmitter()
      emitter.on('test', () => {})
      return expect(emitter.emit('test')).to.eventually.be.true
    })

    it('should resolve to true if there are multiple listeners', function () {
      const emitter = new AsyncEventEmitter()
      emitter.on('test', () => {})
      emitter.on('test', () => {})
      return expect(emitter.emit('test')).to.eventually.be.true
    })
  })

  describe('parallel emit return value', function () {
    it('should be a Promise', function () {
      return expect(new AsyncEventEmitter().emit('=test'))
        .to.be.an.instanceof(Promise)
    })

    it('should resolve to false if there are no listeners', function () {
      return expect(new AsyncEventEmitter().emit('=test'))
        .to.eventually.be.false
    })

    it('should resolve to true if there is a listener', function () {
      const emitter = new AsyncEventEmitter()
      emitter.on('test', () => {})
      return expect(emitter.emit('=test')).to.eventually.be.true
    })

    it('should resolve to true if there are multiple listeners', function () {
      const emitter = new AsyncEventEmitter()
      emitter.on('test', () => {})
      emitter.on('test', () => {})
      return expect(emitter.emit('=test')).to.eventually.be.true
    })
  })

  describe('emit \'error\'', function () {
    it('should reject if unhandled', function () {
      return expect(new AsyncEventEmitter().emit('error'))
        .to.be.rejected
    })

    it('should reject with the specific error if unhandled', function () {
      const bang = new Error('bang')
      return expect(new AsyncEventEmitter().emit('error', bang))
        .to.be.rejectedWith(bang)
    })

    it('should not reject if there is a listener', function () {
      const emitter = new AsyncEventEmitter()
      emitter.on('error', () => {})
      return expect(emitter.emit('error')).to.eventually.be.true
    })

    it('should not reject if there are multiple listeners', function () {
      const emitter = new AsyncEventEmitter()
      emitter.on('error', () => {})
      emitter.on('error', () => {})
      return expect(emitter.emit('error')).to.eventually.be.true
    })
  })

  describe('parallel emit \'error\'', function () {
    it('should reject if unhandled', function () {
      return expect(new AsyncEventEmitter().emit('=error'))
        .to.be.rejected
    })

    it('should reject with the specific error if unhandled', function () {
      const bang = new Error('bang')
      return expect(new AsyncEventEmitter().emit('=error', bang))
        .to.be.rejectedWith(bang)
    })

    it('should not reject if there is a listener', function () {
      const emitter = new AsyncEventEmitter()
      emitter.on('error', () => {})
      return expect(emitter.emit('=error')).to.eventually.be.true
    })

    it('should not reject if there are multiple listeners', function () {
      const emitter = new AsyncEventEmitter()
      emitter.on('error', () => {})
      emitter.on('error', () => {})
      return expect(emitter.emit('=error')).to.eventually.be.true
    })
  })

  describe('emit with async listeners', function () {
    it('should wait for the listener to resolve', function () {
      return expect(testEmit('A')).to.eventually.equal('A')
    })

    it('should wait for the listeners to resolve', function () {
      return expect(testEmit('AB')).to.eventually.equal('AB')
    })

    it('should pass the emitter as \'this\'', function () {
      return expect(testEmit('T')).to.eventually.equal('T')
    })

    it('should pass the event arguments', function () {
      return expect(testEmit('P')).to.eventually.equal('P')
    })

    it('should call prepend listeners first', function () {
      return expect(testEmit('Ab')).to.eventually.equal('bA')
    })
  })

  describe('parallel emit with async listeners', function () {
    it('should wait for the listener to resolve', function () {
      return expect(testEmit('=A')).to.eventually.equal('A')
    })

    it('should wait for the listeners to resolve', function () {
      return expect(testEmit('=AB')).to.eventually.equal('BA')
    })

    it('should pass the emitter as \'this\'', function () {
      return expect(testEmit('=T')).to.eventually.equal('T')
    })

    it('should pass the event arguments', function () {
      return expect(testEmit('=P')).to.eventually.equal('P')
    })
  })

  describe('emit with \'once\' async listeners', function () {
    it('should call \'once\' listeners', function () {
      return expect(testEmit('AO')).to.eventually.equal('AO')
    })

    it('should call \'once\' listeners only once', function () {
      return expect(testEmit('AO', true)).to.eventually.equal('AO:A')
    })

    it('should call \'prependOnce\' listeners', function () {
      return expect(testEmit('Ao')).to.eventually.equal('oA')
    })

    it('should call \'prependOnce\' listeners only once', function () {
      return expect(testEmit('Ao', true)).to.eventually.equal('oA:A')
    })
  })

  describe('parallel emit with \'once\' async listeners', function () {
    it('should call \'once\' listeners', function () {
      return expect(testEmit('=AO')).to.eventually.equal('AO')
    })

    it('should call \'once\' listeners only once', function () {
      return expect(testEmit('=AO', true)).to.eventually.equal('AO:A')
    })

    it('should call \'prependOnce\' listeners', function () {
      return expect(testEmit('=Ao')).to.eventually.equal('Ao')
    })

    it('should call \'prependOnce\' listeners only once', function () {
      return expect(testEmit('=Ao', true)).to.eventually.equal('Ao:A')
    })
  })

  describe('emit with sync and async listeners', function () {
    it('should allow sync listeners', function () {
      return expect(testEmit('I')).to.eventually.equal('I')
    })

    it('should call async and sync listeners in order', function () {
      return expect(testEmit('AIB')).to.eventually.equal('AIB')
    })

    it('should cope with all of the above at once', function () {
      return expect(testEmit('AIaBOPobI', true))
        .to.eventually.equal('boaAIBOPI:baAIBPI')
    })
  })

  describe('parallel emit with sync and async listeners', function () {
    it('should allow sync listeners', function () {
      return expect(testEmit('=I')).to.eventually.equal('I')
    })

    it('should call async and sync listeners in order', function () {
      return expect(testEmit('=AIB')).to.eventually.equal('IBA')
    })

    it('should cope with all of the above at once', function () {
      return expect(testEmit('=AIaBOPobI', true))
        .to.eventually.match(/^IPIbBaAoO:IPIbBaA$/i)
    })
  })

  describe('emit with throwing/rejecting listeners', function () {
    it('should reject if a listener rejects', function () {
      return expect(testEmit('ARB')).to.be.rejectedWith(/^[AB]{0,2}$/)
    })

    it('should reject if a listener throws', function () {
      return expect(testEmit('AXB')).to.be.rejectedWith(/^[AB]{0,2}$/)
    })

    it('should call listeners before the rejecting one', function () {
      return expect(testEmit('ARB')).to.be.rejectedWith(/^A$/)
    })

    it('should call listeners before the throwing one', function () {
      return expect(testEmit('AXB')).to.be.rejectedWith(/^A$/)
    })
  })

  describe('parallel emit with throwing/rejecting listeners', function () {
    it('should reject if a listener rejects', function () {
      return expect(testEmit('=ARB')).to.be.rejectedWith(/^[AB]{0,2}$/)
    })

    it('should reject if a listener throws', function () {
      return expect(testEmit('=AXB')).to.be.rejectedWith(/^[AB]{0,2}$/)
    })

    it('should call all listeners despite the rejecting one', function () {
      return expect(testEmit('=ARB')).to.be.rejectedWith(/^BA$/)
    })

    it('should call listeners before the throwing one', function () {
      return expect(testEmit('=AXB')).to.be.rejectedWith(/^A$/)
    })
  })
})
