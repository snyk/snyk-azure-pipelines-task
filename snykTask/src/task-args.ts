import * as tl from 'azure-pipelines-task-lib';

export type MonitorWhen = undefined | 'never' | 'noIssuesFound' | 'always';
class TaskArgs {
  testType: string | undefined = '';

  targetFile: string | undefined = '';

  dockerImageName: string | undefined = '';
  dockerfilePath: string | undefined = '';

  severityThreshold: string | undefined = '';

  organization: string | undefined = '';
  monitorOnBuild: boolean = true;
  monitorWhen: MonitorWhen = undefined;
  failOnIssues: boolean = true;
  projectName: string | undefined = '';

  testDirectory: string | undefined = '';
  additionalArguments: string = '';
  ignoreUnknownCA: boolean = false;

  delayAfterReportGenerationSeconds: number = 0;

  // the params here are the ones which are mandatory
  constructor(params: { monitorOnBuild: boolean; failOnIssues: boolean }) {
    this.monitorOnBuild = params.monitorOnBuild;
    this.failOnIssues = params.failOnIssues;
  }

  public setMonitorWhen(rawInput?: string) {
    if (rawInput) {
      const lowerCaseInput = rawInput.toLowerCase();
      if (lowerCaseInput === 'never' || lowerCaseInput === 'always') {
        this.monitorWhen = lowerCaseInput;
      } else if (lowerCaseInput === 'noissuesfound') {
        this.monitorWhen = 'noIssuesFound';
      } else {
        console.log(
          `Invalid value for monitorWhen: '${rawInput}'. Ignoring this parameter.`,
        );
      }
    }
  }
  public shouldRunMonitor(snykTestSuccess: boolean): boolean {
    if (this.monitorWhen) {
      if (this.monitorWhen === 'always') {
        return true;
      } else if (this.monitorWhen === 'never') {
        return false;
      } else {
        // noIssuesFound
        return snykTestSuccess;
      }
    } else {
      if (this.monitorOnBuild) {
        return snykTestSuccess;
      } else {
        return false;
      }
    }
  }

  getFileParameter() {
    if (this.targetFile && !this.dockerImageName) {
      return this.targetFile;
    }

    if (this.dockerImageName && this.dockerfilePath) {
      return this.dockerfilePath;
    }

    if (
      this.dockerImageName &&
      !this.dockerfilePath &&
      this.targetFile &&
      this.targetFile.toLowerCase().includes('dockerfile')
    ) {
      return this.targetFile;
    } else {
      return '';
    }
  }
}

export function getAuthToken() {
  const serviceConnectionEndpoint = tl.getInput(
    'serviceConnectionEndpoint',
    false,
  );

  const authToken = tl.getInput('authToken', false);

  if (authToken && !serviceConnectionEndpoint) {
    return authToken;
  } else {
    // pull token from the service connection and fail if it is not set
    if (serviceConnectionEndpoint) {
      const endpointAuthorization = tl.getEndpointAuthorization(
        serviceConnectionEndpoint,
        false,
      );

      if (endpointAuthorization) {
        const authTokenFromServiceConnection =
          endpointAuthorization.parameters['apitoken'];
        return authTokenFromServiceConnection;
      }
    }
  }
  return '';
}

export { TaskArgs };
