import * as tr from "azure-pipelines-task-lib/toolrunner";
import * as tl from "azure-pipelines-task-lib/task";
import * as fs from "fs";

import stream = require("stream");

import {
  getOptionsToExecuteSnykCLICommand,
  getOptionsToExecuteCmd,
  getOptionsForSnykToHtml,
  isSudoPlatform,
  getToolPath,
  sudoExists,
  useSudo,
  formatDate,
  attachReport,
  removeRegexFromFile
} from "../task-lib";
import { TaskArgs } from "../task-args";

afterEach(() => {
  jest.restoreAllMocks();
});

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

  expect(isSudoPlatform(pLinux)).toBe(true);
  expect(isSudoPlatform(pMacos)).toBe(false);
  expect(isSudoPlatform(pWindows)).toBe(false);
});

test("sudoExists works", () => {
  const whichSpy = jest.spyOn(tl, "which").mockReturnValue("/usr/bin/sudo");
  expect(sudoExists()).toBe(true);

  whichSpy.mockReturnValue("");
  expect(sudoExists()).toBe(false);
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

describe("useSudo", () => {
  it("is true for Linux platform", () => {
    jest.spyOn(tl, "which").mockReturnValue("/usr/bin/sudo");
    expect(useSudo(tl.Platform.Linux, false)).toBe(true);
  });

  it("is false for Mac platform even if sudo exists", () => {
    jest.spyOn(tl, "which").mockReturnValue("/usr/bin/sudo");
    expect(useSudo(tl.Platform.MacOS, false)).toBe(false);
  });

  it("is false for Windows platform even if sudo exists (which it should not)", () => {
    jest.spyOn(tl, "which").mockReturnValue("c:/program files/sudo.exe");
    expect(useSudo(tl.Platform.Windows, false)).toBe(false);
  });
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

test("removeRegexFromFile works with global regex", () => {
  const path = "snykTask/test/fixtures/somehtml.html";
  const pathAfter = "snykTask/test/fixtures/somehtmlAfterGlobal.html";
  const pathToChange = "snykTask/test/fixtures/tmp.html";
  const regex = /\[command\].*/g;

  fs.copyFileSync(path, pathToChange);

  try {
    removeRegexFromFile(pathToChange, regex);
    expect(
      fs.readFileSync(pathToChange, { encoding: "utf8", flag: "r" })
    ).toEqual(fs.readFileSync(pathAfter, { encoding: "utf8", flag: "r" }));
  } finally {
    fs.unlinkSync(pathToChange);
  }
});

test("removeRegexFromFile works with non-global regex", () => {
  const path = "snykTask/test/fixtures/somejson.json";
  const pathAfter = "snykTask/test/fixtures/somejsonAfterNonglobal.json";
  const pathToChange = "snykTask/test/fixtures/tmp.json";
  const regex = /\[command\].*/;

  fs.copyFileSync(path, pathToChange);

  try {
    removeRegexFromFile(pathToChange, regex);
    expect(
      fs.readFileSync(pathToChange, { encoding: "utf8", flag: "r" })
    ).toEqual(fs.readFileSync(pathAfter, { encoding: "utf8", flag: "r" }));
  } finally {
    fs.unlinkSync(pathToChange);
  }
});
