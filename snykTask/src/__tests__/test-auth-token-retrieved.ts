/*
 * Copyright 2022 Snyk Ltd.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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
