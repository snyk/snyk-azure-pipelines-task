import * as tl from "azure-pipelines-task-lib";

class TaskArgs {
  testType: string = "";

  targetFile: string = "";

  dockerImageName: string = "";
  dockerfilePath: string = "";

  severityThreshold: string = "";

  organization: string = "";
  monitorOnBuild: boolean = true;
  failOnIssues: boolean = true;
  projectName: string = "";

  testDirectory: string = "";
  additionalArguments: string = "";

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
      this.targetFile.toLowerCase().includes("dockerfile")
    ) {
      return this.targetFile;
    } else {
      return "";
    }
  }
}

export function getAuthToken() {
  const serviceConnectionEndpoint = tl.getInput(
    "serviceConnectionEndpoint",
    false
  );

  const authToken = tl.getInput("authToken", false);

  if (authToken && !serviceConnectionEndpoint) {
    return authToken;
  } else {
    // pull token from the service connection and fail if it is not set
    if (serviceConnectionEndpoint) {
      const endpointAuthorization = tl.getEndpointAuthorization(
        serviceConnectionEndpoint,
        false
      );

      if (endpointAuthorization) {
        const authTokenFromServiceConnection =
          endpointAuthorization.parameters["apitoken"];
        return authTokenFromServiceConnection;
      }
    }
  }
  return "";
}

export { TaskArgs };
