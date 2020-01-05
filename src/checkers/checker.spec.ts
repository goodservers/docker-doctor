global.fetch = fetchMock;
const fetch = fetchMock;
import checker from './checker';

describe('Fetch with Timeout', () => {
  beforeEach(() => {
    fetch.resetMocks();
  });

  it('Is able to retry 5 times to succeed', async () => {
    fetch.mockResponses(
      [JSON.stringify([{ body: 'nok' }]), { status: 500 }],
      [JSON.stringify([{ body: 'nok' }]), { status: 500 }],
      [JSON.stringify([{ body: 'nok' }]), { status: 500 }],
      [JSON.stringify([{ body: 'nok' }]), { status: 500 }],
      [JSON.stringify([{ body: 'ok' }]), { status: 200 }]
    );

    try {
      const status = await checker('http')({
        ip: '192.168.1.1',
        port: 2345,
        maxRetry: 5,
        timeout: 100,
        path: '/',
        validStatuses: [200]
      });
      expect(status).toEqual(200);
    } catch (error) {
      expect(error).toMatch(null);
    }
  });

  it('Throws after 3 unsuccessful retries', async () => {
    fetch.mockResponses(
      [JSON.stringify([{ body: 'nok' }]), { status: 500 }],
      [JSON.stringify([{ body: 'nok' }]), { status: 500 }],
      [JSON.stringify([{ body: 'devil' }]), { status: 666 }]
    );

    await expect(
      checker('http')({
        ip: '192.168.1.1',
        port: 1234,
        maxRetry: 3,
        timeout: 100,
        path: '/',
        validStatuses: [200]
      })
    ).rejects.toThrow(new Error('Wrong status code:666'));
  });
});
