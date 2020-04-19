import { TaskArgs } from "./task-args";
import * as tr from "azure-pipelines-task-lib/toolrunner";
import stream = require("stream");
import * as fs from "fs";

export const getOptionsToExecuteCmd = (taskArgs: TaskArgs): tr.IExecOptions => {
  return {
    cwd: taskArgs.testDirectory,
    failOnStdErr: false,
    ignoreReturnCode: true
  } as tr.IExecOptions;
};

export const getOptionsToExecuteSnykCLICommand = (
  taskArgs: TaskArgs,
  taskNameForAnalytics: string,
  taskVersion: string
): tr.IExecOptions => {
  const envVars = process.env;
  envVars["SNYK_INTEGRATION_NAME"] = taskNameForAnalytics;
  envVars["SNYK_INTEGRATION_VERSION"] = taskVersion;

  const options = {
    cwd: taskArgs.testDirectory,
    failOnStdErr: false,
    ignoreReturnCode: true,
    env: envVars
  } as tr.IExecOptions;

  return options;
};

export const getOptionsToWriteFile = (
  file: string,
  workDir: string,
  taskArgs: TaskArgs,
  taskNameForAnalytics?: string,
  taskVersion?: string
): tr.IExecOptions => {
  const jsonFilePath = `${workDir}/${file}`;
  const writableString: stream.Writable = fs.createWriteStream(jsonFilePath);

  const envVars = process.env;
  if (taskNameForAnalytics) {
    envVars["SNYK_INTEGRATION_NAME"] = taskNameForAnalytics;
  }
  if (taskVersion) {
    envVars["SNYK_INTEGRATION_VERSION"] = taskVersion;
  }

  return {
    cwd: taskArgs.testDirectory,
    failOnStdErr: false,
    ignoreReturnCode: true,
    outStream: writableString,
    env: envVars
  } as tr.IExecOptions;
};
