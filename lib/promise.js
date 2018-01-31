'use strict';

const resolution = require('./resolution');
const STATE = require('./state');

class Promise {
  constructor(resolver) {
    if (typeof resolver !== 'function') {
      throw TypeError(`Promise resolver ${resolver} is not a function`);
    }

    this._status = STATE.PENDING;
    this._value = null;
    this._callbacks = [];
    try {
      resolver(this.resolve.bind(this), this.reject.bind(this));
    } catch (e) {
      this.reject(e);
    }
  }

  then(onFulfilled, onRejected) {
    if (typeof onFulfilled !== 'function') onFulfilled = v => v;
    if (typeof onRejected !== 'function') onRejected = e => { throw e; };

    const promise = new Promise((resolve, reject) => {
      const fn = () => {
        process.nextTick(() => {
          try {
            if (this._status === STATE.FULFILLED) {
              const x = onFulfilled(this._value);
              resolution(promise, x, resolve, reject);
            } else if (this._status === STATE.REJECTED) {
              const x = onRejected(this._value);
              resolution(promise, x, resolve, reject);
            } else {
              reject(new TypeError('Invalid promise status'));
            }
          } catch (e) {
            reject(e);
          }
        });
      };
      if (this._status === STATE.PENDING) {
        this._callbacks.push(fn);
      } else {
        fn();
      }
    });
    return promise;
  }

  resolve(value) {
    process.nextTick(() => {
      if (this._status === STATE.PENDING) {
        this._status = STATE.FULFILLED;
        this._value = value;
        this._callbacks.forEach(fn => fn());
      }
    });
  }

  reject(reason) {
    process.nextTick(() => {
      if (this._status === STATE.PENDING) {
        this._status = STATE.REJECTED;
        this._value = reason;
        this._callbacks.forEach(fn => fn());
      }
    });
  }
}

module.exports = Promise;
