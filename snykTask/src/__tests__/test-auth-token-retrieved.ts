import { EndpointAuthorization } from "azure-pipelines-task-lib";

beforeEach(() => {
  jest.resetModules();
});

test("test auth token pulled from service connection", () => {
  const mockEndpointAuthorization = {
    parameters: {
      apitoken: "some-token"
    },
    scheme: "somescheme"
  } as EndpointAuthorization;

  jest.doMock("azure-pipelines-task-lib/task", () => {
    return {
      // getInput: jest.fn((name: string, required?: boolean) => "mockValue")
      getInput: jest.fn((name: string, required?: boolean) => {
        if (name === "serviceConnectionEndpoint") {
          return "some-serviceConnectionEndpoint";
        } else if (name === "authToken") {
          return null;
        }
      }),
      getEndpointAuthorization: jest
        .fn()
        .mockReturnValue(mockEndpointAuthorization)
    };
  });

  const att = require("../task-args");
  const retrievedAuthToken = att.getAuthToken(false);
  expect(retrievedAuthToken).toBe("some-token");
});

test("test auth token pulled from authToken input parameter if isTest is true", () => {
  const mockEndpointAuthorization = {
    parameters: {
      apitoken: "some-token"
    },
    scheme: "somescheme"
  } as EndpointAuthorization;

  // defined not inline here so I can call toHaveBeenCalledTimes on it
  const mockFnGetEndpointAuthorization = jest
    .fn()
    .mockReturnValue(mockEndpointAuthorization);

  jest.doMock("azure-pipelines-task-lib/task", () => {
    return {
      // getInput: jest.fn((name: string, required?: boolean) => "mockValue")
      getInput: jest.fn((name: string, required?: boolean) => {
        if (name === "serviceConnectionEndpoint") {
          return "some-serviceConnectionEndpoint";
        } else if (name === "authToken") {
          return "some-test-auth-token";
        }
      }),
      // getEndpointAuthorization: jest.fn().mockReturnValue(mockEndpointAuthorization)
      getEndpointAuthorization: mockFnGetEndpointAuthorization
    };
  });

  const att = require("../task-args");
  const retrievedAuthToken = att.getAuthToken(true);
  expect(retrievedAuthToken).toBe("some-test-auth-token");
  expect(mockFnGetEndpointAuthorization).toHaveBeenCalledTimes(0);
});
