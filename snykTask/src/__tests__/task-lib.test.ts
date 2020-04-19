import * as tr from "azure-pipelines-task-lib/toolrunner";
import stream = require("stream");

import {
  getOptionsToExecuteSnykCLICommand,
  getOptionsToExecuteCmd,
  getOptionsToWriteFile
} from "../task-lib";
import { TaskArgs } from "../task-args";

test("getOptionsToExecuteSnyk builds IExecOptions like we need it", () => {
  const taskArgs: TaskArgs = new TaskArgs();
  taskArgs.testDirectory = "/some/path";

  const options: tr.IExecOptions = getOptionsToExecuteCmd(taskArgs);

  expect(options.cwd).toBe("/some/path");
  expect(options.failOnStdErr).toBe(false);
  expect(options.ignoreReturnCode).toBe(true);
});

test("getOptionsToExecuteSnykCLICommand builds IExecOptions like we need it", () => {
  const taskNameForAnalytics = "snyk-azure-pipelines-task";
  const version = "1.2.3";

  const taskArgs: TaskArgs = new TaskArgs();
  taskArgs.testDirectory = "/some/path";

  const options: tr.IExecOptions = getOptionsToExecuteSnykCLICommand(
    taskArgs,
    taskNameForAnalytics,
    version
  );

  expect(options.cwd).toBe("/some/path");
  expect(options.failOnStdErr).toBe(false);
  expect(options.ignoreReturnCode).toBe(true);
  expect(options.env?.SNYK_INTEGRATION_NAME).toBe("snyk-azure-pipelines-task");
  expect(options.env?.SNYK_INTEGRATION_VERSION).toBe(version);
});

test("getOptionsToWriteFile builds IExecOptions like we need it", () => {
  const outputFilePath = "./test-output-file.discardable";
  const testDirectory = process.cwd();

  const taskArgs: TaskArgs = new TaskArgs();
  taskArgs.testDirectory = "/some/path";

  const options: tr.IExecOptions = getOptionsToWriteFile(
    outputFilePath,
    testDirectory,
    taskArgs
  );

  expect(options.cwd).toBe("/some/path");
  expect(options.failOnStdErr).toBe(false);
  expect(options.ignoreReturnCode).toBe(true);
  expect(options.outStream).toBeInstanceOf(stream.Writable);
});

test("getOptionsToWriteFile builds IExecOptions like we need it for snyk test", () => {
  const outputFilePath = "./test-output-file.discardable";
  const testDirectory = process.cwd();
  const taskNameForAnalytics = "snyk-azure-pipelines-task";
  const version = "1.2.3";

  const taskArgs: TaskArgs = new TaskArgs();
  taskArgs.testDirectory = "/some/path";

  const options: tr.IExecOptions = getOptionsToWriteFile(
    outputFilePath,
    testDirectory,
    taskArgs,
    taskNameForAnalytics,
    version
  );

  expect(options.cwd).toBe("/some/path");
  expect(options.failOnStdErr).toBe(false);
  expect(options.ignoreReturnCode).toBe(true);
  expect(options.outStream).toBeInstanceOf(stream.Writable);
  expect(options.env?.SNYK_INTEGRATION_NAME).toBe("snyk-azure-pipelines-task");
  expect(options.env?.SNYK_INTEGRATION_VERSION).toBe(version);
});
