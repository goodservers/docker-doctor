import request from 'request';

export const httpsChecker = ({ ip, port, maxRetry = 30, timeout = 1000 }) => {
  let count = 0;

  return new Promise((resolve, reject) => {
    const httpRetry = (maxRetry, timeout) => {
      const url = `https://${ip}:${port}`;
      request(url, { timeout: 5000 }, (error, response, body) => {
        if (response && response.statusCode === 200) {
          console.log(
            `OMG, ${url} is alive!, status code: ${response.statusCode}`
          );
          resolve(response.statusCode);
        } else if (count++ < maxRetry) {
          console.log(`Trying to check ${url} - attempt ${count}/${maxRetry}`);
          return setTimeout(() => {
            httpRetry(maxRetry, timeout);
          }, timeout);
        } else {
          console.log('testConnection Error:', error);
          reject('testConnection Error:', error);
        }
      });
    };
    httpRetry(maxRetry, timeout);
  });
};
