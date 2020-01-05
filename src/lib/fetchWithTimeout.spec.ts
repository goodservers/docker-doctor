global.fetch = fetchMock;
const fetch = fetchMock;
import fetchWithTimeout from '../lib/fetchWithTimeout';

describe('Fetch with Timeout', () => {
  beforeEach(() => {
    fetch.resetMocks();
  });

  it('Is able to timeout after 50ms', async () => {
    fetch.mockResponseOnce(
      () =>
        new Promise(resolve => setTimeout(() => resolve({ body: 'ok' }), 100))
    );
    try {
      await fetchWithTimeout('http://localhost:1234', 50);
    } catch (error) {
      expect(error).toEqual(new Error('Fetch timeout'));
    }
  });
});
