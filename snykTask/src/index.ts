import * as tl from "azure-pipelines-task-lib/task";
import * as tr from "azure-pipelines-task-lib/toolrunner";
// import { loadPartialConfig } from '@babel/core';

enum InstallMethod {
  NPM,
  NPMWithSudo,
  Binary
}

function buildToolRunner(tool: string, requiresSudo: boolean): tr.ToolRunner {
  if (requiresSudo) {
    const sudoPath = tl.which("sudo");
    return tl.tool(sudoPath).arg(tool);
  } else {
    const toolPath = tl.which(tool);
    console.log(`toolPath: ${toolPath}`);
    return tl.tool(toolPath);
  }
}

async function run() {
  try {
    const currentWorkingDirectory: string = tl.cwd();
    console.log(`currentWorkingDirectory: ${currentWorkingDirectory}\n`);

    const isTest: boolean = tl.getInput("isTest", false) === "true";

    // retrieve and log all input fields
    const authToken = tl.getInput("authToken", false);
    console.log(`authToken: ${authToken}`);

    const serviceConnectionEndpoint = tl.getInput(
      "serviceConnectionEndpoint",
      false
    );
    console.log(`serviceConnectionEndpoint: ${serviceConnectionEndpoint}\n`);

    // todo: see about using something like tl.logDetail

    // const authTokenToUse = authToken;
    let authTokenToUse = "";

    // very kludgy thing to make the tests work but have it still work in Azure with the service connection
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

        // const endpointAuthorization = tl.getEndpointAuthorization("mySnykServiceConnectionEndpoint", false);

        if (endpointAuthorization) {
          const authTokenFromServiceConnection =
            endpointAuthorization.parameters["apitoken"];
          authTokenToUse = authTokenFromServiceConnection;
          console.log(
            `authTokenFromServiceConnection: ${authTokenFromServiceConnection}\n`
          );
        }
      }
    }

    console.log("\nTokens:");
    console.log(`authToken: ${authToken}\n`);
    console.log(`authTokenToUse: ${authTokenToUse}\n`);

    const projectName = tl.getInput("project-name", false);
    console.log(`project-name: ${projectName}`);

    const testDirectory = tl.getInput("test-directory", false);
    console.log(`test-directory: ${testDirectory}`);

    const inputTargetFile = tl.getInput("target-file", false);
    console.log(`target-file (raw input): ${inputTargetFile}`);

    const targetFile = inputTargetFile;
    console.log(`targetFile: ${targetFile}`);

    const organization = tl.getInput("organization", false);
    console.log(`organization: ${organization}`);

    const severityThreshold = tl.getInput("severity-threshold", false);
    console.log(`severity-threshold: ${severityThreshold}`);

    const failOnIssues = tl.getBoolInput("fail-on-issues", true);
    console.log(`fail-on-issues: ${failOnIssues}`);

    const monitorOnBuild: boolean =
      tl.getInput("monitor-on-build", true) === "true";
    console.log(`monitor-on-build: ${monitorOnBuild}`);

    const additionalArguments = tl.getInput("additional-arguments", false);
    console.log(`additional-arguments: ${additionalArguments}`);

    const dockerImageName = tl.getInput("docker-image-name", false);
    console.log(`docker-image-name: ${additionalArguments}`);

    const options = {
      cwd: testDirectory,
      failOnStdErr: false,
      ignoreReturnCode: true
    } as tr.IExecOptions;

    const lsPath = tl.which("ls");
    console.log(`\nlsPath: ${lsPath}\n`);

    const lsToolRunner: tr.ToolRunner = tl.tool(lsPath);
    lsToolRunner.arg("-la");
    const lsExitCode = await lsToolRunner.exec(options);
    console.log(`lsExitCode: ${lsExitCode}\n`);

    // I can't Mock the getPlatform stuff: https://github.com/microsoft/azure-pipelines-task-lib/issues/530

    const chooseInstallMethod = (p: tl.Platform) => {
      if (p === tl.Platform.Linux) {
        return InstallMethod.NPMWithSudo;
      } else if (p === tl.Platform.Windows) {
        return InstallMethod.NPM;
      } else if (p === tl.Platform.MacOS) {
        return InstallMethod.NPM;
      } else {
        // this is not possible but is required because JavaScript
        return InstallMethod.NPM;
      }
    };

    let installMethod = InstallMethod.NPMWithSudo;
    if (!isTest) {
      const platform: tl.Platform = tl.getPlatform();
      installMethod = chooseInstallMethod(platform);
    }
    console.log(`installMethod: ${installMethod}\n`);

    const useSudo = installMethod === InstallMethod.NPMWithSudo;
    console.log(`useSudo: ${useSudo}`);

    // Install snyk
    const installSnykToolRunner: tr.ToolRunner = buildToolRunner("npm", useSudo)
      .arg("install")
      .arg("-g")
      .arg("snyk");

    const installSnykExitCode = await installSnykToolRunner.exec(options);
    console.log(`installSnykExitCode: ${installSnykExitCode}\n`);

    // snyk auth
    const snykAuthToolRunner: tr.ToolRunner = buildToolRunner("snyk", useSudo)
      .arg("auth")
      .arg(authTokenToUse);

    const snykAuthExitCode = await snykAuthToolRunner.exec(options);
    console.log(`snykAuthExitCode: ${snykAuthExitCode}\n`);

    // TODO: play with setVariable as an option to use instead of running `snyk auth`
    // tl.setVariable('SNYK_TOKEN', authToken, true);

    // Snyk test
    let cleansedSeverityThreshold = "";
    if (severityThreshold) {
      cleansedSeverityThreshold = severityThreshold.toLowerCase();

      if (
        cleansedSeverityThreshold !== "high" &&
        cleansedSeverityThreshold !== "medium"
      ) {
        tl.setResult(
          tl.TaskResult.Failed,
          "severity threshold must be 'high' or 'medium' (case insensitive)"
        );
        return;
      }
    }

    console.log(`severityThreshold: ${severityThreshold}\n`);
    console.log(`cleansedSeverityThreshold: ${cleansedSeverityThreshold}\n`);

    const snykTestToolRunner: tr.ToolRunner = buildToolRunner("snyk", useSudo)
      .arg("test")
      .argIf(
        cleansedSeverityThreshold,
        `--severity-threshold=${cleansedSeverityThreshold}`
      )
      .argIf(dockerImageName, `--docker`)
      .argIf(dockerImageName, `${dockerImageName}`)
      .argIf(targetFile, `--file=${targetFile}`)
      .argIf(additionalArguments, additionalArguments);

    const snykTestExitCode = await snykTestToolRunner.exec(options);
    console.log(`snykTestExitCode: ${snykTestExitCode}\n`);

    if (failOnIssues && snykTestExitCode !== 0) {
      tl.setResult(
        tl.TaskResult.Failed,
        "failing task because `snyk test` found issues"
      );
    }

    console.log(`monitorOnBuild: ${monitorOnBuild}`);

    if (monitorOnBuild && snykTestExitCode === 0) {
      const snykMonitorToolRunner: tr.ToolRunner = buildToolRunner(
        "snyk",
        useSudo
      )
        .arg("monitor")
        .argIf(dockerImageName, `--docker`)
        .argIf(dockerImageName, `${dockerImageName}`)
        .argIf(targetFile, `--file=${targetFile}`)
        .argIf(organization, `--org=${organization}`)
        .argIf(projectName, `--project-name=${projectName}`)
        .argIf(additionalArguments, additionalArguments);

      const snykMonitorExitCode = await snykMonitorToolRunner.exec(options);
      console.log(`snykMonitorExitCode: ${snykMonitorExitCode}\n`);
    }
  } catch (err) {
    console.log("exception caught!");
    console.log(err.message);
    console.log(err);
    tl.setResult(tl.TaskResult.Failed, err.message);
  }
}

run();
