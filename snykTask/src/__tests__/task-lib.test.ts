import * as tr from "azure-pipelines-task-lib/toolrunner";
import * as tl from "azure-pipelines-task-lib/task";
import * as fs from "fs";

import stream = require("stream");

import {
  getOptionsToExecuteSnykCLICommand,
  getOptionsToExecuteCmd,
  getOptionsForSnykToHtml,
  isSudoMode,
  getToolPath,
  formatDate,
  attachReport
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
  const taskNameForAnalytics = "AZURE_PIPELINES";
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
  expect(options.env?.SNYK_INTEGRATION_NAME).toBe("AZURE_PIPELINES");
  expect(options.env?.SNYK_INTEGRATION_VERSION).toBe(version);
});

test("getOptionsForSnykToHtml builds IExecOptions for running snyk-to-html", () => {
  const taskArgs: TaskArgs = new TaskArgs();
  taskArgs.testDirectory = "/some/path";
  const htmlReportFilePath = "report.html";
  const options: tr.IExecOptions = getOptionsForSnykToHtml(
    htmlReportFilePath,
    taskArgs
  );

  expect(options.cwd).toBe("/some/path");
  expect(options.failOnStdErr).toBe(false);
  expect(options.ignoreReturnCode).toBe(true);
  expect(options.outStream).toBeInstanceOf(stream.Writable);
});

test("isSudoMode returns true only for Linux platforms", () => {
  const pLinux = tl.Platform.Linux;
  const pMacos = tl.Platform.MacOS;
  const pWindows = tl.Platform.Windows;

  expect(isSudoMode(pLinux)).toBe(true);
  expect(isSudoMode(pMacos)).toBe(false);
  expect(isSudoMode(pWindows)).toBe(false);
});

test("getToolPath returns sudo if require and not if not required", () => {
  // mock the which function from the azure-pipelines-task-lib/task
  const mockTlWhichFn = jest
    .fn()
    .mockImplementation((tool: string, check?: boolean) => {
      return `/usr/bin/${tool}`;
    });

  expect(mockTlWhichFn("anything")).toBe("/usr/bin/anything");
  expect(mockTlWhichFn("sudo")).toBe("/usr/bin/sudo");

  expect(getToolPath("some-command", mockTlWhichFn)).toBe(
    "/usr/bin/some-command"
  );
  expect(getToolPath("some-command", mockTlWhichFn, false)).toBe(
    "/usr/bin/some-command"
  );
  expect(getToolPath("some-command", mockTlWhichFn, true)).toBe(
    "/usr/bin/sudo"
  );
});

test("formatDate gives format we want for the report filename", () => {
  const timestampMillis = 1590174610000; // arbitrary timestamp in ms since epoch
  const d = new Date(timestampMillis);
  const timestamp = formatDate(d);
  expect(timestamp).toBe("2020-05-22T19-10-10");
});

test("attachReport works", () => {
  const filePath = "/path/to/report.html";
  const fsExistsSyncSpy = jest.spyOn(fs, "existsSync").mockReturnValue(true);
  const addAttachmentSpy = jest
    .spyOn(tl, "addAttachment")
    .mockReturnValue(undefined);

  attachReport(filePath, "HTML_ATTACHMENT_TYPE");
  expect(addAttachmentSpy).toHaveBeenCalledTimes(1);
  expect(addAttachmentSpy).toHaveBeenNthCalledWith(
    1,
    "HTML_ATTACHMENT_TYPE",
    "report.html",
    filePath
  );

  fsExistsSyncSpy.mockRestore();
  addAttachmentSpy.mockRestore();
});
