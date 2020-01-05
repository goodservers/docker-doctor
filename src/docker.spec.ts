import { findContainers, findContainerWithId, getFirst, parseContainerName } from './docker';

const response = [
  {
    Id: '51de75e60338c071e6d7592da3765f2babebd327b3ad3b71ebc89952ef5eae03',
    Names: ['/1563225228_deploy-guide_1'],
    Image: 'registry.gitlab.com/tomwagner/deploy-guide:latest',
    ImageID:
      'sha256:b0880364088d91eaaffd52f6bc69fe7641d5918d9b6f886fe00b902c6fb854ac',
    Command: "/bin/sh -c 'yarn production'",
    Created: 1563225228,
    Ports: [{ PrivatePort: 3000, Type: 'tcp' }],
    Labels: {
      'com.docker.compose.config-hash':
        'bed63bbcb91dd6661affc604a12b477de72f9d7868de3ad04ac038c9528eb2eb',
      'com.docker.compose.container-number': '1',
      'com.docker.compose.oneoff': 'False',
      'com.docker.compose.project': '1563225228',
      'com.docker.compose.service': 'deploy-guide',
      'com.docker.compose.version': '1.23.2'
    },
    State: 'running',
    Status: 'Up Less than a second',
    HostConfig: { NetworkMode: 'nginx-proxy' },
    NetworkSettings: {
      Networks: {
        'nginx-proxy': {
          IPAMConfig: null,
          Links: null,
          Aliases: null,
          NetworkID:
            '4d7aeb4887c2255ba090f1b2003409a8050b337d2f29f532f479c5a5d91c013a',
          EndpointID:
            '320f274239e9e23c99f15b5cc79492332824dedef24a6a84183dbc40378a98b4',
          Gateway: '172.18.0.1',
          IPAddress: '172.18.0.5',
          IPPrefixLen: 16,
          IPv6Gateway: '',
          GlobalIPv6Address: '',
          GlobalIPv6PrefixLen: 0,
          MacAddress: '02:42:ac:12:00:05',
          DriverOpts: null
        }
      }
    },
    Mounts: []
  }
];

jest.mock('dockerode');

beforeEach(() => {
  // Clear all instances and calls to constructor and all methods:
  // SoundPlayer.mockClear();
  // mockPlaySoundFile.mockClear();
  const Docker = require('dockerode');
  Docker.prototype.listContainers.mockImplementation(() =>
    Promise.resolve(response)
  );
});

test('Should findContainers containers by name', async () => {
  const data = await findContainers('deploy-guide');
  expect(data).toEqual(response);
});

test('Should find no non-existing containers', async () => {
  const data = await findContainers('xxx');
  expect(data).toEqual([]);
});

test('Find Container by id', async () => {
  await expect(
    findContainerWithId(
      '51de75e60338c071e6d7592da3765f2babebd327b3ad3b71ebc89952ef5eae03'
    )
  ).resolves.toEqual(response[0]);
});

test('Find Container by non-existing id', async () => {
  const id = 'mklmklcmsaclmsd';

  await expect(findContainerWithId(id)).rejects.toBe(
    'Container "mklmklcmsaclmsd" not found'
  );
});

test('getFirst', () => {
  const array = [1, 2, 3];

  expect(getFirst(array)).toEqual(1);
});

test('getFirst from empty array', () => {
  const array = [];

  expect(getFirst(array)).toEqual(undefined);
});

describe('parseContainerName', () => {
  it('Should parse container name in correct format', () => {
    expect(parseContainerName('121212_dsadsad_1')).toEqual({
      name: 'dsadsad',
      prefix: '121212',
      scale: 1
    });
  });

  it('Should throw error if container name is not in correct format', () => {
    try {
      expect(parseContainerName('fdafdsa')).toThrow(Error);
    } catch (error) {}
  });
});
