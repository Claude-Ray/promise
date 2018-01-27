'use strict';

const STATE = require('./state');

module.exports = function resolution(promise, x, resolve, reject) {
  let isCalled = false;
  if (promise === x) {
    return reject(new TypeError('cycled promise'));
  }
  if (x instanceof Promise) {
    if (x._state === STATE.PENDING) {
      x.then(y => resolution(promise, y, resolve, reject), reject);
    } else {
      x.then(resolve, reject);
    }
  } else if (x && (typeof x === 'function' || typeof x === 'object')) {
    try {
      const then = x.then;
      if (typeof then === 'function') {
        then.call(x, y => {
          if (isCalled) return;
          isCalled = true;
          return resolution(promise, y, resolve, reject);
        }, r => {
          if (isCalled) return;
          isCalled = true;
          return reject(r);
        });
      } else {
        return resolve(x);
      }
    } catch (e) {
      if (isCalled) return;
      return reject(e);
    }
  } else {
    return resolve(x);
  }
};
