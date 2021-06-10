import * as tr from 'azure-pipelines-task-lib/toolrunner';
import * as tl from 'azure-pipelines-task-lib/task';
import * as fs from 'fs';

import stream = require('stream');

import {
  getOptionsToExecuteSnykCLICommand,
  getOptionsToExecuteCmd,
  getOptionsForSnykToHtml,
  formatDate,
  attachReport,
  removeRegexFromFile,
} from '../task-lib';
import { TaskArgs } from '../task-args';

afterEach(() => {
  jest.restoreAllMocks();
});

test('getOptionsToExecuteSnyk builds IExecOptions like we need it', () => {
  const taskArgs: TaskArgs = new TaskArgs();
  taskArgs.testDirectory = '/some/path';

  const options: tr.IExecOptions = getOptionsToExecuteCmd(taskArgs);

  expect(options.cwd).toBe('/some/path');
  expect(options.failOnStdErr).toBe(false);
  expect(options.ignoreReturnCode).toBe(true);
});

test('getOptionsToExecuteSnykCLICommand builds IExecOptions like we need it', () => {
  const taskNameForAnalytics = 'AZURE_PIPELINES';
  const version = '1.2.3';

  const taskArgs: TaskArgs = new TaskArgs();
  taskArgs.testDirectory = '/some/path';

  const options: tr.IExecOptions = getOptionsToExecuteSnykCLICommand(
    taskArgs,
    taskNameForAnalytics,
    version,
    'fake-token',
  );

  expect(options.cwd).toBe('/some/path');
  expect(options.failOnStdErr).toBe(false);
  expect(options.ignoreReturnCode).toBe(true);
  expect(options.env?.SNYK_INTEGRATION_NAME).toBe('AZURE_PIPELINES');
  expect(options.env?.SNYK_INTEGRATION_VERSION).toBe(version);
  expect(options.env?.SNYK_TOKEN).toBe('fake-token');
});

test('getOptionsForSnykToHtml builds IExecOptions for running snyk-to-html', () => {
  const taskArgs: TaskArgs = new TaskArgs();
  taskArgs.testDirectory = '/some/path';
  const htmlReportFilePath = 'report.html';
  const options: tr.IExecOptions = getOptionsForSnykToHtml(
    htmlReportFilePath,
    taskArgs,
  );

  expect(options.cwd).toBe('/some/path');
  expect(options.failOnStdErr).toBe(false);
  expect(options.ignoreReturnCode).toBe(true);
  expect(options.outStream).toBeInstanceOf(stream.Writable);
});

test('formatDate gives format we want for the report filename', () => {
  const timestampMillis = 1590174610000; // arbitrary timestamp in ms since epoch
  const d = new Date(timestampMillis);
  const timestamp = formatDate(d);
  expect(timestamp).toBe('2020-05-22T19-10-10');
});

test('attachReport works', () => {
  const filePath = '/path/to/report.html';
  const fsExistsSyncSpy = jest.spyOn(fs, 'existsSync').mockReturnValue(true);
  const addAttachmentSpy = jest
    .spyOn(tl, 'addAttachment')
    .mockReturnValue(undefined);

  attachReport(filePath, 'HTML_ATTACHMENT_TYPE');
  expect(addAttachmentSpy).toHaveBeenCalledTimes(1);
  expect(addAttachmentSpy).toHaveBeenNthCalledWith(
    1,
    'HTML_ATTACHMENT_TYPE',
    'report.html',
    filePath,
  );

  fsExistsSyncSpy.mockRestore();
  addAttachmentSpy.mockRestore();
});

test('removeRegexFromFile works with global regex', () => {
  const path = 'snykTask/test/fixtures/somehtml.html';
  const pathAfter = 'snykTask/test/fixtures/somehtmlAfterGlobal.html';
  const pathToChange = 'snykTask/test/fixtures/tmp.html';
  const regex = /\[command\].*/g;

  fs.copyFileSync(path, pathToChange);

  try {
    removeRegexFromFile(pathToChange, regex);
    expect(
      fs.readFileSync(pathToChange, { encoding: 'utf8', flag: 'r' }),
    ).toEqual(fs.readFileSync(pathAfter, { encoding: 'utf8', flag: 'r' }));
  } finally {
    fs.unlinkSync(pathToChange);
  }
});

test('removeRegexFromFile works with non-global regex', () => {
  const path = 'snykTask/test/fixtures/somejson.json';
  const pathAfter = 'snykTask/test/fixtures/somejsonAfterNonglobal.json';
  const pathToChange = 'snykTask/test/fixtures/tmp.json';
  const regex = /\[command\].*/;

  fs.copyFileSync(path, pathToChange);

  try {
    removeRegexFromFile(pathToChange, regex);
    expect(
      fs.readFileSync(pathToChange, { encoding: 'utf8', flag: 'r' }),
    ).toEqual(fs.readFileSync(pathAfter, { encoding: 'utf8', flag: 'r' }));
  } finally {
    fs.unlinkSync(pathToChange);
  }
});
