import { EndpointAuthorization } from 'azure-pipelines-task-lib';

beforeEach(() => {
  jest.resetModules();
});

test('test auth token pulled from service connection', () => {
  const mockEndpointAuthorization = {
    parameters: {
      apitoken: 'some-token',
    },
    scheme: 'somescheme',
  } as EndpointAuthorization;

  jest.doMock('azure-pipelines-task-lib/task', () => {
    return {
      // getInput: jest.fn((name: string, required?: boolean) => "mockValue")
      getInput: jest.fn((name: string, required?: boolean) => {
        if (name === 'serviceConnectionEndpoint') {
          return 'some-serviceConnectionEndpoint';
        } else if (name === 'authToken') {
          return null;
        }
      }),
      getEndpointAuthorization: jest
        .fn()
        .mockReturnValue(mockEndpointAuthorization),
    };
  });

  const att = require('../task-args');
  const retrievedAuthToken = att.getAuthToken();
  expect(retrievedAuthToken).toBe('some-token');
});

test('test auth token pulled from serviceConnectionEndpoint if both authToken and serviceConnectionEndpoint are set', () => {
  const mockEndpointAuthorization = {
    parameters: {
      apitoken: 'some-token-from-service-connection',
    },
    scheme: 'somescheme',
  } as EndpointAuthorization;

  // defined not inline here so I can call toHaveBeenCalledTimes on it
  const mockFnGetEndpointAuthorization = jest
    .fn()
    .mockReturnValue(mockEndpointAuthorization);

  jest.doMock('azure-pipelines-task-lib/task', () => {
    return {
      // getInput: jest.fn((name: string, required?: boolean) => "mockValue")
      getInput: jest.fn((name: string, required?: boolean) => {
        if (name === 'serviceConnectionEndpoint') {
          return 'some-serviceConnectionEndpoint';
        } else if (name === 'authToken') {
          return 'some-test-auth-token';
        }
      }),
      // getEndpointAuthorization: jest.fn().mockReturnValue(mockEndpointAuthorization)
      getEndpointAuthorization: mockFnGetEndpointAuthorization,
    };
  });

  const att = require('../task-args');
  const retrievedAuthToken = att.getAuthToken();
  expect(retrievedAuthToken).toBe('some-token-from-service-connection');
  expect(mockFnGetEndpointAuthorization).toHaveBeenCalledTimes(1);
});

test('test auth token pulled from authToken if both authToken set and serviceConnectionEndpoint is not', () => {
  const mockEndpointAuthorization = {
    parameters: {
      apitoken: 'some-token-from-service-connection',
    },
    scheme: 'somescheme',
  } as EndpointAuthorization;

  // defined not inline here so I can call toHaveBeenCalledTimes on it
  const mockFnGetEndpointAuthorization = jest
    .fn()
    .mockReturnValue(mockEndpointAuthorization);

  jest.doMock('azure-pipelines-task-lib/task', () => {
    return {
      // getInput: jest.fn((name: string, required?: boolean) => "mockValue")
      getInput: jest.fn((name: string, required?: boolean) => {
        if (name === 'serviceConnectionEndpoint') {
          return null;
        } else if (name === 'authToken') {
          return 'some-test-auth-token';
        }
      }),
      // getEndpointAuthorization: jest.fn().mockReturnValue(mockEndpointAuthorization)
      getEndpointAuthorization: mockFnGetEndpointAuthorization,
    };
  });

  const att = require('../task-args');
  const retrievedAuthToken = att.getAuthToken();
  expect(retrievedAuthToken).toBe('some-test-auth-token');
  expect(mockFnGetEndpointAuthorization).toHaveBeenCalledTimes(0);
});

test('test auth token returns empty string if both authToken set and serviceConnectionEndpoint are not set', () => {
  const mockEndpointAuthorization = {
    parameters: {
      apitoken: 'some-token-from-service-connection',
    },
    scheme: 'somescheme',
  } as EndpointAuthorization;

  // defined not inline here so I can call toHaveBeenCalledTimes on it
  const mockFnGetEndpointAuthorization = jest
    .fn()
    .mockReturnValue(mockEndpointAuthorization);

  jest.doMock('azure-pipelines-task-lib/task', () => {
    return {
      // getInput: jest.fn((name: string, required?: boolean) => "mockValue")
      getInput: jest.fn((name: string, required?: boolean) => {
        if (name === 'serviceConnectionEndpoint') {
          return null;
        } else if (name === 'authToken') {
          return null;
        }
      }),
      // getEndpointAuthorization: jest.fn().mockReturnValue(mockEndpointAuthorization)
      getEndpointAuthorization: mockFnGetEndpointAuthorization,
    };
  });

  const att = require('../task-args');
  const retrievedAuthToken = att.getAuthToken();
  expect(retrievedAuthToken).toBe('');
  expect(mockFnGetEndpointAuthorization).toHaveBeenCalledTimes(0);
});
