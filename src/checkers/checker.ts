import fetchWithTimeout from '../lib/fetchWithTimeout';

type StatusCode = number;

export default (protocol = 'http') => ({
  ip,
  port,
  maxRetry = 30,
  timeout = 1000,
  path = '/',
  validStatuses = [200, 201, 401]
}): Promise<StatusCode> => {
  let count = 1;

  return new Promise((resolve, reject) => {
    const retry = async (maxRetry: number, timeout: number) => {
      const url = `${protocol}://${ip}:${port}${path}`;
      try {
        console.log(`Trying to check ${url} - attempt ${count}/${maxRetry}`);
        const response = await fetchWithTimeout(url, timeout);

        if (response && validStatuses.includes(response.status)) {
          console.log(`OMG, ${url} is alive!, status code: ${response.status}`);
          resolve(response.status);
        } else {
          throw new Error('Wrong status code:' + response.status);
        }
      } catch (error) {
        if (count++ < maxRetry) {
          return setTimeout(() => retry(maxRetry, timeout), timeout);
        } else {
          reject(error);
        }
      }
    };
    retry(maxRetry, timeout);
  });
};
