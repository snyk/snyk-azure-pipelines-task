import { setupMocks, MockObjects } from './helpers/mock-run';

beforeEach(() => {
  jest.resetModules();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('run()', () => {
  it('sets SNYK_API when service connection has a URL configured', async () => {
    const mocks: MockObjects = setupMocks({
      endpointUrl: 'https://api.eu.snyk.io',
    });

    const { run } = require('../index');
    await run();

    expect(mocks.tl.setResult).toHaveBeenCalledWith(0, 'Snyk Scan completed');

    const execCalls = mocks.toolRunner.exec.mock.calls;
    const callWithEnv = execCalls.find(
      (call) => call[0]?.env?.SNYK_API !== undefined,
    );
    expect(callWithEnv).toBeDefined();
    expect(callWithEnv[0].env.SNYK_API).toBe('https://api.eu.snyk.io');
  });

  it('does not set SNYK_API when no URL in service connection', async () => {
    const mocks: MockObjects = setupMocks({
      endpointUrl: undefined,
    });

    const { run } = require('../index');
    await run();

    expect(mocks.tl.setResult).toHaveBeenCalledWith(0, 'Snyk Scan completed');

    const execCalls = mocks.toolRunner.exec.mock.calls;
    for (const call of execCalls) {
      if (call[0]?.env) {
        expect(call[0].env.SNYK_API).toBeUndefined();
      }
    }
  });

  it('fails when Agent.TempDirectory is not set', async () => {
    const mocks: MockObjects = setupMocks({
      variables: { 'Agent.TempDirectory': undefined },
    });

    const { run } = require('../index');
    await run();

    expect(mocks.tl.setResult).toHaveBeenCalledWith(
      2,
      'Agent.TempDirectory is not set',
    );
  });

  it('fails when auth token is missing', async () => {
    const mocks: MockObjects = setupMocks({
      endpointAuthorization: undefined,
      inputs: {
        serviceConnectionEndpoint: null,
        authToken: null,
      },
    });

    const { run } = require('../index');
    await run();

    expect(mocks.tl.setResult).toHaveBeenCalledWith(
      2,
      expect.stringContaining('auth token is not set'),
    );
  });

  it('succeeds on happy path', async () => {
    const mocks: MockObjects = setupMocks();

    const { run } = require('../index');
    await run();

    expect(mocks.tl.setResult).toHaveBeenCalledWith(0, 'Snyk Scan completed');
  });
});
