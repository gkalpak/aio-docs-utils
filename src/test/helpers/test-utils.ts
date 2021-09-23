export const reversePromise = <T>(promise: Promise<T>): Promise<any> =>
  promise.then(v => Promise.reject(v), e => Promise.resolve(e));
