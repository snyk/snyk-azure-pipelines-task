import * as tl from 'azure-pipelines-task-lib';

class TaskArgs {
  testType: string | undefined = '';

  targetFile: string | undefined = '';

  dockerImageName: string | undefined = '';
  dockerfilePath: string | undefined = '';

  severityThreshold: string | undefined = '';

  organization: string | undefined = '';
  monitorOnBuild: boolean = true;
  failOnIssues: boolean = true;
  projectName: string | undefined = '';

  testDirectory: string | undefined = '';
  additionalArguments: string = '';
  ignoreUnknownCA: boolean = false;

  delayAfterReportGenerationSeconds: number = 0;

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
