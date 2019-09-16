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

export function getAuthToken(isTest: boolean) {
  let authTokenToUse = "";

  const serviceConnectionEndpoint = tl.getInput(
    "serviceConnectionEndpoint",
    false
  );
  console.log(`serviceConnectionEndpoint: ${serviceConnectionEndpoint}\n`);

  // very kludgy thing to make the tests work but have it still work in Azure with the service connection
  const authToken = tl.getInput("authToken", false);
  if (isTest) {
    // use authToken field
    authTokenToUse = authToken;
  } else if (authToken && !serviceConnectionEndpoint) {
    // use authToken field
    console.log(
      "authToken is set and serviceConnectionEndpoint is not... using authToken"
    );
    authTokenToUse = authToken;
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
        authTokenToUse = authTokenFromServiceConnection;
      }
    }
  }
  return authTokenToUse;
}

export { TaskArgs };
