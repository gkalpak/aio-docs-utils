export const reversePromise = <T>(promise: Promise<T>) =>
  promise.then(v => Promise.reject(v), e => Promise.resolve(e));
