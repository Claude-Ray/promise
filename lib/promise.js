'use strict';

const resolution = require('./resolution');
const STATE = require('./state');

const STATUS = Symbol('status');
const VALUE = Symbol('value');
const CALLBACKS = Symbol('callbacks');

class Promise {
  constructor(resolver) {
    if (typeof resolver !== 'function') {
      throw TypeError(`Promise resolver ${resolver} is not a function`);
    }

    this[STATUS] = STATE.PENDING;
    this[VALUE] = null;
    this[CALLBACKS] = [];
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
            if (this[STATUS] === STATE.FULFILLED) {
              const x = onFulfilled(this[VALUE]);
              resolution(promise, x, resolve, reject);
            } else if (this[STATUS] === STATE.REJECTED) {
              const x = onRejected(this[VALUE]);
              resolution(promise, x, resolve, reject);
            } else {
              reject(new TypeError('Invalid promise status'));
            }
          } catch (e) {
            reject(e);
          }
        });
      };
      if (this[STATUS] === STATE.PENDING) {
        this[CALLBACKS].push(fn);
      } else {
        fn();
      }
    });
    return promise;
  }

  resolve(value) {
    process.nextTick(() => {
      if (this[STATUS] === STATE.PENDING) {
        this[STATUS] = STATE.FULFILLED;
        this[VALUE] = value;
        this[CALLBACKS].forEach(fn => fn());
      }
    });
  }

  reject(reason) {
    process.nextTick(() => {
      if (this[STATUS] === STATE.PENDING) {
        this[STATUS] = STATE.REJECTED;
        this[VALUE] = reason;
        this[CALLBACKS].forEach(fn => fn());
      }
    });
  }

  catch(onRejected) {
    return this.then(null, onRejected);
  }

  finally(onFinally) {
    return this.then(
      value => new Promise(resolve => resolve(onFinally())).then(() => value),
      reason => new Promise(resolve => resolve(onFinally())).then(() => { throw reason; })
    );
  }

  static resolve(value) {
    return new Promise(resolve => resolve(value));
  }

  static reject(reason) {
    return new Promise((resolve, reject) => reject(reason));
  }

  static all() {
    const arr = Array.prototype.slice.call(arguments);
    return new Promise((resolve, reject) => {
      if (arr.length === 0) return resolve([]);
      const result = [];
      let remaining = arr.length;
      arr.forEach((item, index) => {
        Promise.resolve(item).then(value => {
          result[index] = value;
          if (--remaining === 0) resolve(result);
        }, reject);
      });
    });
  }

  static race() {
    const arr = Array.prototype.slice.call(arguments);
    return new Promise((resolve, reject) =>
      arr.forEach(item => Promise.resolve(item).then(resolve, reject)));
  }
}

module.exports = Promise;
