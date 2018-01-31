'use strict';

const STATE = require('./state');

module.exports = function resolution(promise, x, resolve, reject) {
  let isCalled = 0;
  if (promise === x) {
    reject(new TypeError('cycled promise'));
  }
  if (x instanceof Promise) {
    x._state === STATE.PENDING
      ? x.then(y => resolution(promise, y, resolve, reject), reject)
      : x.then(resolve, reject);
  } else if (x && (typeof x === 'function' || typeof x === 'object')) {
    try {
      const then = x.then;
      const resolvePromise = y => isCalled++ || resolution(promise, y, resolve, reject);
      const rejectPromise = r => isCalled++ || reject(r);

      typeof then === 'function'
        ? then.call(x, resolvePromise, rejectPromise)
        : resolve(x);
    } catch (e) {
      if (!isCalled) reject(e);
    }
  } else {
    resolve(x);
  }
};
