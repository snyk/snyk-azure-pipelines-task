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
    }

    return this.targetFile || "";
  }
}

export { TaskArgs };
