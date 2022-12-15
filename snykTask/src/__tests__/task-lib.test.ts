/*
 * Copyright 2022 Snyk Ltd.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as tr from 'azure-pipelines-task-lib/toolrunner';
import * as tl from 'azure-pipelines-task-lib/task';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as fse from 'fs-extra';

import stream = require('stream');

import {
  getOptionsToExecuteSnykCLICommand,
  getOptionsToExecuteCmd,
  getOptionsForSnykToHtml,
  formatDate,
  attachReport,
  removeRegexFromFile,
  doVulnerabilitiesExistForFailureThreshold,
} from '../task-lib';
import { TaskArgs } from '../task-args';

let tempFolder = '';
beforeAll(async () => {
  tempFolder = await fse.promises.mkdtemp(
    path.resolve(os.tmpdir(), 'snyk-azure-pipelines-task-test'),
  );
});

afterEach(() => {
  jest.restoreAllMocks();
});

afterAll(() => {
  fse.remove(tempFolder);
});

test('getOptionsToExecuteSnyk builds IExecOptions like we need it', () => {
  const taskArgs: TaskArgs = new TaskArgs({
    failOnIssues: true,
  });
  taskArgs.testDirectory = '/some/path';

  const options: tr.IExecOptions = getOptionsToExecuteCmd(taskArgs);

  expect(options.cwd).toBe('/some/path');
  expect(options.failOnStdErr).toBe(false);
  expect(options.ignoreReturnCode).toBe(true);
});

test('finds vulnerabilities greater than medium threshold in single-project results', () => {
  const fixturePath =
    'snykTask/test/fixtures/single-project-high-vulnerabilities.json';
  const itemsFound = doVulnerabilitiesExistForFailureThreshold(
    fixturePath,
    'medium',
  );

  expect(itemsFound).toBe(true);
});

test('finds vulnerabilities greater than medium threshold in multi-project results', () => {
  const fixturePath = 'snykTask/test/fixtures/high-vulnerabilities.json';
  const itemsFound = doVulnerabilitiesExistForFailureThreshold(
    fixturePath,
    'medium',
  );

  expect(itemsFound).toBe(true);
});

test('defaults to found when file does not exist', () => {
  const fixturePath = 'snykTask/test/fixtures/does-not-exist.json';
  const itemsFound = doVulnerabilitiesExistForFailureThreshold(
    fixturePath,
    'medium',
  );

  expect(itemsFound).toBe(true);
});

test('does not match vulnerabilities lower than high threshold', () => {
  const fixturePath = 'snykTask/test/fixtures/low-vulnerabilities.json';
  const itemsFound = doVulnerabilitiesExistForFailureThreshold(
    fixturePath,
    'high',
  );

  expect(itemsFound).toBe(false);
});

test('getOptionsToExecuteSnykCLICommand builds IExecOptions like we need it', () => {
  const taskNameForAnalytics = 'AZURE_PIPELINES';
  const version = '1.2.3';

  const taskArgs: TaskArgs = new TaskArgs({
    failOnIssues: true,
  });
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

describe('getOptionsForSnykToHtml', () => {
  it('builds IExecOptions for running snyk-to-html', async () => {
    const taskArgs: TaskArgs = new TaskArgs({
      failOnIssues: true,
    });
    taskArgs.testDirectory = '/some/path';
    const htmlReportFilePath = path.resolve(tempFolder, 'report.html');
    const options: tr.IExecOptions = getOptionsForSnykToHtml(
      htmlReportFilePath,
      taskArgs,
    );
    expect(options.cwd).toBe('/some/path');
    expect(options.failOnStdErr).toBe(false);
    expect(options.ignoreReturnCode).toBe(true);
    expect(options.outStream).toBeInstanceOf(stream.Writable);
  });
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

describe('removeRegexFromFile', () => {
  it('works with global regex', () => {
    const fixturePath = 'snykTask/test/fixtures/somehtml.html';
    const expectedContentsAfterPath =
      'snykTask/test/fixtures/somehtmlAfterGlobal.html';
    const tempFileToModifyPath = path.resolve(tempFolder, 'tmp.html');
    const regex = /\[command\].*/g;
    fs.copyFileSync(fixturePath, tempFileToModifyPath);
    removeRegexFromFile(tempFileToModifyPath, regex);
    expect(
      fs.readFileSync(tempFileToModifyPath, { encoding: 'utf8', flag: 'r' }),
    ).toEqual(
      fs.readFileSync(expectedContentsAfterPath, {
        encoding: 'utf8',
        flag: 'r',
      }),
    );
  });

  it('works with non-global regex', () => {
    const fixturePath = 'snykTask/test/fixtures/somejson.json';
    const expectedContentsAfterPath =
      'snykTask/test/fixtures/somejsonAfterNonglobal.json';
    const tempFileToModifyPath = path.resolve(tempFolder, 'tmp.json');
    const regex = /\[command\].*/;
    fs.copyFileSync(fixturePath, tempFileToModifyPath);
    removeRegexFromFile(tempFileToModifyPath, regex);
    expect(
      fs.readFileSync(tempFileToModifyPath, { encoding: 'utf8', flag: 'r' }),
    ).toEqual(
      fs.readFileSync(expectedContentsAfterPath, {
        encoding: 'utf8',
        flag: 'r',
      }),
    );
  });
});
