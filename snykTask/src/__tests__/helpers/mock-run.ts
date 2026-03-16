export interface MockConfig {
  inputs: Record<string, string | null>;
  boolInputs: Record<string, boolean>;
  variables: Record<string, string | undefined>;
  endpointUrl: string | undefined;
  endpointAuthorization:
    | { parameters: Record<string, string>; scheme: string }
    | undefined;
  platform: number;
  snykExitCode: number;
  snykToHtmlExitCode: number;
  monitorExitCode: number;
}

export const defaultMockConfig: MockConfig = {
  inputs: {
    serviceConnectionEndpoint: 'my-service-connection',
    authToken: null,
    testType: 'app',
    command: null,
    targetFile: null,
    dockerImageName: null,
    dockerfilePath: null,
    projectName: null,
    organization: null,
    monitorWhen: 'never',
    delayAfterReportGenerationSeconds: null,
    additionalArguments: null,
    testDirectory: null,
    severityThreshold: 'low',
    codeSeverityThreshold: null,
    failOnThreshold: 'low',
    distributionChannel: 'stable',
  },
  boolInputs: {
    failOnIssues: true,
    debug: false,
    ignoreUnknownCA: false,
  },
  variables: {
    'Agent.TempDirectory': '/tmp/agent-temp',
  },
  endpointUrl: undefined,
  endpointAuthorization: {
    parameters: { apitoken: 'fake-snyk-token' },
    scheme: 'Token',
  },
  platform: 1, // Platform.MacOS
  snykExitCode: 0,
  snykToHtmlExitCode: 0,
  monitorExitCode: 0,
};

export interface MockObjects {
  tl: {
    setResult: jest.Mock;
    tool: jest.Mock;
    getInput: jest.Mock;
    getBoolInput: jest.Mock;
    getVariable: jest.Mock;
    getEndpointAuthorization: jest.Mock;
    getEndpointUrl: jest.Mock;
    getPlatform: jest.Mock;
    cwd: jest.Mock;
    which: jest.Mock;
    writeFile: jest.Mock;
    addAttachment: jest.Mock;
  };
  toolRunner: {
    exec: jest.Mock;
    execSync: jest.Mock;
    execAsync: jest.Mock;
    arg: jest.Mock;
    argIf: jest.Mock;
    line: jest.Mock;
  };
  downloadExecutable: jest.Mock;
  getSnykDownloadInfo: jest.Mock;
  fsExistsSync: jest.Mock;
  fsReadFileSync: jest.Mock;
}

export function setupMocks(overrides: Partial<MockConfig> = {}): MockObjects {
  const config: MockConfig = {
    ...defaultMockConfig,
    ...overrides,
    inputs: { ...defaultMockConfig.inputs, ...overrides.inputs },
    boolInputs: { ...defaultMockConfig.boolInputs, ...overrides.boolInputs },
    variables: { ...defaultMockConfig.variables, ...overrides.variables },
  };

  const mockExec = jest.fn().mockResolvedValue(config.snykExitCode);
  const mockExecSync = jest.fn().mockReturnValue({
    stdout: '{}',
    stderr: '',
    code: config.snykExitCode,
  });
  const mockExecAsync = jest.fn().mockResolvedValue(config.snykExitCode);
  const mockArg = jest.fn().mockReturnThis();
  const mockArgIf = jest.fn().mockReturnThis();
  const mockLine = jest.fn().mockReturnThis();

  const toolRunner = {
    exec: mockExec,
    execSync: mockExecSync,
    execAsync: mockExecAsync,
    arg: mockArg,
    argIf: mockArgIf,
    line: mockLine,
  };

  const mockSetResult = jest.fn();
  const mockTool = jest.fn().mockReturnValue(toolRunner);
  const mockGetInput = jest.fn((name: string) => config.inputs[name] ?? null);
  const mockGetBoolInput = jest.fn(
    (name: string) => config.boolInputs[name] ?? false,
  );
  const mockGetVariable = jest.fn(
    (name: string) => config.variables[name] ?? undefined,
  );
  const mockGetEndpointAuthorization = jest
    .fn()
    .mockReturnValue(config.endpointAuthorization);
  const mockGetEndpointUrl = jest.fn().mockReturnValue(config.endpointUrl);
  const mockGetPlatform = jest.fn().mockReturnValue(config.platform);
  const mockCwd = jest.fn().mockReturnValue('/working/dir');
  const mockWhich = jest.fn().mockReturnValue('/usr/bin/ls');
  const mockWriteFile = jest.fn();
  const mockAddAttachment = jest.fn();

  const tl = {
    setResult: mockSetResult,
    tool: mockTool,
    getInput: mockGetInput,
    getBoolInput: mockGetBoolInput,
    getVariable: mockGetVariable,
    getEndpointAuthorization: mockGetEndpointAuthorization,
    getEndpointUrl: mockGetEndpointUrl,
    getPlatform: mockGetPlatform,
    cwd: mockCwd,
    which: mockWhich,
    writeFile: mockWriteFile,
    addAttachment: mockAddAttachment,
  };

  jest.doMock('azure-pipelines-task-lib/task', () => ({
    ...tl,
    TaskResult: { Succeeded: 0, Failed: 2 },
  }));

  jest.doMock('azure-pipelines-task-lib', () => ({
    ...tl,
    TaskResult: { Succeeded: 0, Failed: 2 },
  }));

  const mockDownloadExecutable = jest
    .fn()
    .mockResolvedValue('/tmp/agent-temp/snyk-macos');
  const mockGetSnykDownloadInfo = jest.fn().mockReturnValue({
    snyk: {
      filename: 'snyk-macos',
      downloadUrl: 'https://downloads.snyk.io/cli/stable/snyk-macos',
      fallbackUrl: 'https://static.snyk.io/cli/latest/snyk-macos',
    },
    snykToHtml: {
      filename: 'snyk-to-html-macos',
      downloadUrl:
        'https://downloads.snyk.io/snyk-to-html/latest/snyk-to-html-macos',
      fallbackUrl:
        'https://static.snyk.io/snyk-to-html/latest/snyk-to-html-macos',
    },
  });

  jest.doMock('../../install', () => ({
    getSnykDownloadInfo: mockGetSnykDownloadInfo,
    downloadExecutable: mockDownloadExecutable,
  }));

  jest.doMock('../../task-version', () => ({
    getTaskVersion: jest.fn().mockReturnValue('1.0.0'),
  }));

  const mockFsExistsSync = jest.fn().mockReturnValue(true);
  const mockFsReadFileSync = jest.fn().mockReturnValue(
    JSON.stringify({
      version: { Major: 1, Minor: 0, Patch: 0 },
    }),
  );

  const mockWriteStream = {
    on: jest.fn().mockReturnThis(),
    write: jest.fn(),
    end: jest.fn(),
    once: jest.fn(),
    emit: jest.fn(),
  };
  const mockCreateWriteStream = jest.fn().mockReturnValue(mockWriteStream);

  jest.doMock('fs', () => {
    const actualFs = jest.requireActual('fs');
    return {
      ...actualFs,
      existsSync: mockFsExistsSync,
      readFileSync: mockFsReadFileSync,
      createWriteStream: mockCreateWriteStream,
    };
  });

  return {
    tl,
    toolRunner,
    downloadExecutable: mockDownloadExecutable,
    getSnykDownloadInfo: mockGetSnykDownloadInfo,
    fsExistsSync: mockFsExistsSync,
    fsReadFileSync: mockFsReadFileSync,
  };
}
