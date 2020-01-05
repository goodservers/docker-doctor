import * as fetch from 'isomorphic-fetch';

export default (
  url: string,
  timeout = 5000,
  options?: RequestInit
): Promise<any> =>
  Promise.race([
    fetch(url, options),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Fetch timeout')), timeout)
    )
  ]);
