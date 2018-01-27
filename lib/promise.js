'use strict';

const resolution = require('./resolution');
const STATE = require('./state');

class Promise {
  constructor(resolver) {
    if (typeof resolver !== 'function') {
      throw TypeError(`Promise resolver ${resolver} is not a function`);
    }

    const self = this;
    self._status = STATE.PENDING;
    self._value = null;
    self._callbacks = [];
    try {
      resolver(self.resolve.bind(self), self.reject.bind(self));
    } catch (e) {
      self.reject(e);
    }
  }

  then(onFulfilled, onRejected) {
    const self = this;
    if (typeof onFulfilled !== 'function') onFulfilled = v => v;
    if (typeof onRejected !== 'function') onRejected = e => { throw e; };

    if (self._status === STATE.PENDING) {
      const a = new Promise((resolve, reject) => {
        self._callbacks.push(() => {
          process.nextTick(() => {
            try {
              if (this._status === STATE.FULFILLED) {
                const x = onFulfilled(this._value);
                resolution(a, x, resolve, reject);
              } else if (this._status === STATE.REJECTED) {
                const x = onRejected(this._value);
                resolution(a, x, resolve, reject);
              }
            } catch (e) {
              reject(e);
            }
          });
        });
      });
      return a;
    }

    if (self._status === STATE.FULFILLED) {
      const a = new Promise((resolve, reject) => {
        process.nextTick(() => {
          try {
            const x = onFulfilled(self._value);
            resolution(a, x, resolve, reject);
          } catch (e) {
            reject(e);
          }
        });
      });
      return a;
    }

    if (self._status === STATE.REJECTED) {
      const a = new Promise((resolve, reject) => {
        process.nextTick(() => {
          try {
            const x = onRejected(self._value);
            resolution(a, x, resolve, reject);
          } catch (e) {
            reject(e);
          }
        });
      });
      return a;
    }

    throw new TypeError('Invalid status value');
  }

  resolve(value) {
    process.nextTick(() => {
      if (this._status === STATE.PENDING) {
        this._status = STATE.FULFILLED;
        this._value = value;
        this._callbacks.forEach(fn => fn(this));
      }
    });
  }

  reject(reason) {
    process.nextTick(() => {
      if (this._status === STATE.PENDING) {
        this._status = STATE.REJECTED;
        this._value = reason;
        this._callbacks.forEach(fn => fn(this));
      }
    });
  }

  static deferred() {
    const dfd = {};
    dfd.promise = new Promise((resolve, reject) => {
      dfd.resolve = resolve;
      dfd.reject = reject;
    });
    return dfd;
  }
}

module.exports = Promise;
