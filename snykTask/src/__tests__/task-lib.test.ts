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
import { generateSnykCodeResultsWithoutIssues } from '../index';
import * as stream from 'stream';
import { getSnykDownloadInfo, downloadExecutable } from '../install';

jest.setTimeout(120_000);

import {
  getOptionsToExecuteSnykCLICommand,
  getOptionsToExecuteCmd,
  getOptionsForSnykToHtml,
  formatDate,
  attachReport,
  removeRegexFromFile,
  doVulnerabilitiesExistForFailureThreshold,
  Severity,
} from '../task-lib';
import { TaskArgs } from '../task-args';
import { execSync } from 'child_process';

let tempFolder = '';
let snykCliPath = '';

function getTestToken(): string {
  if (process.env.SNYK_TOKEN === undefined) {
    const output = execSync(snykCliPath + ' config get api');
    return output.toString().trim();
  }

  return process.env.SNYK_TOKEN;
}

beforeAll(async () => {
  tempFolder = await fse.promises.mkdtemp(
    path.resolve(os.tmpdir(), 'snyk-azure-pipelines-task-test'),
  );

  process.env['AGENT_TEMPDIRECTORY'] = tempFolder;

  snykCliPath = await downloadExecutable(
    getSnykDownloadInfo(tl.getPlatform()).snyk,
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
    Severity.MEDIUM,
  );

  expect(itemsFound).toBe(true);
});

test('finds vulnerabilities greater than medium threshold in multi-project results', () => {
  const fixturePath = 'snykTask/test/fixtures/high-vulnerabilities.json';
  const itemsFound = doVulnerabilitiesExistForFailureThreshold(
    fixturePath,
    Severity.MEDIUM,
  );

  expect(itemsFound).toBe(true);
});

test('finds vulnerabilities greater than high threshold in container applications', () => {
  const fixturePath =
    'snykTask/test/fixtures/container-app-vulnerabilities-critical.json';
  const itemsFound = doVulnerabilitiesExistForFailureThreshold(
    fixturePath,
    Severity.HIGH,
  );

  expect(itemsFound).toBe(true);
});

test('does not find vulnerabilities greater than high threshold in container applications', () => {
  const fixturePath =
    'snykTask/test/fixtures/container-app-vulnerabilities-medium.json';
  const itemsFound = doVulnerabilitiesExistForFailureThreshold(
    fixturePath,
    Severity.HIGH,
  );

  expect(itemsFound).toBe(false);
});

test('defaults to found when file does not exist', () => {
  const fixturePath = 'snykTask/test/fixtures/does-not-exist.json';
  const itemsFound = doVulnerabilitiesExistForFailureThreshold(
    fixturePath,
    Severity.MEDIUM,
  );

  expect(itemsFound).toBe(true);
});

test('does not match vulnerabilities lower than high threshold', () => {
  const fixturePath = 'snykTask/test/fixtures/low-vulnerabilities.json';
  const itemsFound = doVulnerabilitiesExistForFailureThreshold(
    fixturePath,
    Severity.HIGH,
  );

  expect(itemsFound).toBe(false);
});

// code test output json with level: none, note, warning, error
test('finds issues in code test of low threshold', () => {
  const fixturePath = 'snykTask/test/fixtures/code-test-none-issues.json';
  const itemsFound = doVulnerabilitiesExistForFailureThreshold(
    fixturePath,
    Severity.LOW,
  );

  expect(itemsFound).toBe(true);
});

test('finds issues in code test of low threshold', () => {
  const fixturePath = 'snykTask/test/fixtures/code-test-note-issues.json';
  const itemsFound = doVulnerabilitiesExistForFailureThreshold(
    fixturePath,
    Severity.LOW,
  );

  expect(itemsFound).toBe(true);
});

test('finds issues in code test of medium threshold', () => {
  const fixturePath = 'snykTask/test/fixtures/code-test-warning-issues.json';
  const itemsFound = doVulnerabilitiesExistForFailureThreshold(
    fixturePath,
    Severity.MEDIUM,
  );

  expect(itemsFound).toBe(true);
});

test('finds issues in code test of high threshold', () => {
  const fixturePath = 'snykTask/test/fixtures/code-test-error-issues.json';
  const itemsFound = doVulnerabilitiesExistForFailureThreshold(
    fixturePath,
    Severity.HIGH,
  );

  expect(itemsFound).toBe(true);
});

test('finds medium and above severity threshold issues in code test result of high threshold', () => {
  const fixturePath = 'snykTask/test/fixtures/code-test-error-issues.json';
  const itemsFound = doVulnerabilitiesExistForFailureThreshold(
    fixturePath,
    Severity.MEDIUM,
  );

  expect(itemsFound).toBe(true);
});

test('finds no issues in code test of low threshold', () => {
  const fixturePath = 'snykTask/test/fixtures/code-test-no-issues.json';
  const itemsFound = doVulnerabilitiesExistForFailureThreshold(
    fixturePath,
    Severity.LOW,
  );

  expect(itemsFound).toBe(false);
});

test('finds no issues in code test of medium threshold', () => {
  const fixturePath = 'snykTask/test/fixtures/code-test-no-issues.json';
  const itemsFound = doVulnerabilitiesExistForFailureThreshold(
    fixturePath,
    Severity.MEDIUM,
  );

  expect(itemsFound).toBe(false);
});

test('finds no issues in code test of high threshold', () => {
  const fixturePath = 'snykTask/test/fixtures/code-test-no-issues.json';
  const itemsFound = doVulnerabilitiesExistForFailureThreshold(
    fixturePath,
    Severity.HIGH,
  );

  expect(itemsFound).toBe(false);
});

test('ignores suppressed issues with status accepted', () => {
  const fixturePath =
    'snykTask/test/fixtures/code-test-accepted-suppression.json';
  const itemsFound = doVulnerabilitiesExistForFailureThreshold(
    fixturePath,
    Severity.HIGH,
  );

  expect(itemsFound).toBe(false);
});

test('ignores suppressed issues with status rejected', () => {
  const fixturePath =
    'snykTask/test/fixtures/code-test-rejected-suppression.json';
  const itemsFound = doVulnerabilitiesExistForFailureThreshold(
    fixturePath,
    Severity.HIGH,
  );

  expect(itemsFound).toBe(true);
});

test('ignores suppressed issues with status underReview', () => {
  const fixturePath =
    'snykTask/test/fixtures/code-test-underreview-suppression.json';
  const itemsFound = doVulnerabilitiesExistForFailureThreshold(
    fixturePath,
    Severity.HIGH,
  );

  expect(itemsFound).toBe(true);
});

test('ignores suppressed issues with multiple statuses - at least one accepted', () => {
  const fixturePath =
    'snykTask/test/fixtures/code-test-multiple-suppressions-accepted.json';
  const itemsFound = doVulnerabilitiesExistForFailureThreshold(
    fixturePath,
    Severity.HIGH,
  );

  expect(itemsFound).toBe(false);
});

test('ignores suppressed issues with multiple statuses - none accepted', () => {
  const fixturePath =
    'snykTask/test/fixtures/code-test-multiple-suppressions-rejected.json';
  const itemsFound = doVulnerabilitiesExistForFailureThreshold(
    fixturePath,
    Severity.HIGH,
  );

  expect(itemsFound).toBe(true);
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

describe('generateSnykCodeResultsWithoutIssues sends console output to file', () => {
  it('basic test for generateSnykCodeResultsWithoutIssues()', async () => {
    const taskArgs: TaskArgs = new TaskArgs({
      failOnIssues: true,
    });

    taskArgs.testDirectory = path.join(
      __dirname,
      '..',
      '..',
      'test',
      'fixtures',
      'golang-no-code-issues',
    );
    console.debug(taskArgs.testDirectory);

    const outputPath = path.join(
      tempFolder,
      'generateSnykCodeResultsWithoutIssues_test.json',
    );
    const testToken = getTestToken();

    expect(fs.existsSync(outputPath)).toBeFalsy();

    // call method under test
    await generateSnykCodeResultsWithoutIssues(
      snykCliPath,
      taskArgs,
      outputPath,
      testToken,
    );

    // check expected output
    const actualFileStat = fs.statSync(outputPath);
    expect(actualFileStat.isFile()).toBeTruthy();
    expect(actualFileStat.size).toBeGreaterThan(0);

    const actualFileContent = fs.readFileSync(outputPath);
    const obj = JSON.parse(actualFileContent.toString());
    expect(obj).not.toBeNull();

    console.debug(obj);
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
