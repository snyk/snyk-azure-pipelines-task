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

import { downloadExecutable, getSnykDownloadInfo } from '../../install';
import { Platform } from 'azure-pipelines-task-lib/task';
import * as nock from 'nock';
import * as os from 'os';
import * as path from 'path';
import * as uuid from 'uuid/v4';
import * as fs from 'fs';

describe('getSnykDownloadInfo', () => {
  it('retrieves the correct download info for Linux', () => {
    const dlInfo = getSnykDownloadInfo(Platform.Linux);
    expect(dlInfo).toEqual({
      snyk: {
        filename: 'snyk-linux',
        downloadUrl: 'https://downloads.snyk.io/cli/stable/snyk-linux',
        backupUrl: 'https://static.snyk.io/cli/stable/snyk-linux',
      },
      snykToHtml: {
        filename: 'snyk-to-html-linux',
        downloadUrl:
          'https://downloads.snyk.io/snyk-to-html/latest/snyk-to-html-linux',
        backupUrl:
          'https://static.snyk.io/snyk-to-html/latest/snyk-to-html-linux',
      },
    });
  });

  it('retrieves the correct download info for Windows', () => {
    const dlInfo = getSnykDownloadInfo(Platform.Windows);
    expect(dlInfo).toEqual({
      snyk: {
        filename: 'snyk-win.exe',
        downloadUrl: 'https://downloads.snyk.io/cli/stable/snyk-win.exe',
        backupUrl: 'https://static.snyk.io/cli/stable/snyk-win.exe',
      },
      snykToHtml: {
        filename: 'snyk-to-html-win.exe',
        downloadUrl:
          'https://downloads.snyk.io/snyk-to-html/latest/snyk-to-html-win.exe',
        backupUrl:
          'https://static.snyk.io/snyk-to-html/latest/snyk-to-html-win.exe',
      },
    });
  });

  it('retrieves the correct download info for MacOS', () => {
    const dlInfo = getSnykDownloadInfo(Platform.MacOS);
    expect(dlInfo).toEqual({
      snyk: {
        filename: 'snyk-macos',
        downloadUrl: 'https://downloads.snyk.io/cli/stable/snyk-macos',
        backupUrl: 'https://static.snyk.io/cli/stable/snyk-macos',
      },
      snykToHtml: {
        filename: 'snyk-to-html-macos',
        downloadUrl:
          'https://downloads.snyk.io/snyk-to-html/latest/snyk-to-html-macos',
        backupUrl:
          'https://static.snyk.io/snyk-to-html/latest/snyk-to-html-macos',
      },
    });
  });

  it('retrieves the correct download info a preview release', () => {
    const dlInfo = getSnykDownloadInfo(Platform.MacOS, 'preview ');
    expect(dlInfo).toEqual({
      snyk: {
        filename: 'snyk-macos',
        downloadUrl: 'https://downloads.snyk.io/cli/preview/snyk-macos',
        backupUrl: 'https://static.snyk.io/cli/preview/snyk-macos',
      },
      snykToHtml: {
        filename: 'snyk-to-html-macos',
        downloadUrl:
          'https://downloads.snyk.io/snyk-to-html/latest/snyk-to-html-macos',
        backupUrl:
          'https://static.snyk.io/snyk-to-html/latest/snyk-to-html-macos',
      },
    });
  });

  it('retrieves the correct download info for a valid semver', () => {
    const dlInfo = getSnykDownloadInfo(Platform.MacOS, '1.1287.0');
    expect(dlInfo).toEqual({
      snyk: {
        filename: 'snyk-macos',
        downloadUrl: 'https://downloads.snyk.io/cli/v1.1287.0/snyk-macos',
        backupUrl: 'https://static.snyk.io/cli/v1.1287.0/snyk-macos',
      },
      snykToHtml: {
        filename: 'snyk-to-html-macos',
        downloadUrl:
          'https://downloads.snyk.io/snyk-to-html/latest/snyk-to-html-macos',
        backupUrl:
          'https://static.snyk.io/snyk-to-html/latest/snyk-to-html-macos',
      },
    });
  });

  it('retrieves the correct download info for a valid semver and sanitizes input', () => {
    const dlInfo = getSnykDownloadInfo(Platform.MacOS, 'v1.1287.0  ');
    expect(dlInfo).toEqual({
      snyk: {
        filename: 'snyk-macos',
        downloadUrl: 'https://downloads.snyk.io/cli/v1.1287.0/snyk-macos',
        backupUrl: 'https://static.snyk.io/cli/v1.1287.0/snyk-macos',
      },
      snykToHtml: {
        filename: 'snyk-to-html-macos',
        downloadUrl:
          'https://downloads.snyk.io/snyk-to-html/latest/snyk-to-html-macos',
        backupUrl:
          'https://static.snyk.io/snyk-to-html/latest/snyk-to-html-macos',
      },
    });
  });

  it('ignores invalid versions', () => {
    const dlInfo = getSnykDownloadInfo(Platform.MacOS, 'invalid-channel');
    expect(dlInfo).toEqual({
      snyk: {
        filename: 'snyk-macos',
        downloadUrl: 'https://downloads.snyk.io/cli/stable/snyk-macos',
        backupUrl: 'https://static.snyk.io/cli/stable/snyk-macos',
      },
      snykToHtml: {
        filename: 'snyk-to-html-macos',
        downloadUrl:
          'https://downloads.snyk.io/snyk-to-html/latest/snyk-to-html-macos',
        backupUrl:
          'https://static.snyk.io/snyk-to-html/latest/snyk-to-html-macos',
      },
    });
  });
});

describe('downloadExecutable', () => {
  let mockConsoleError: jest.SpyInstance;

  beforeAll(() => {
    // Mock console.error to prevent logging during tests
    mockConsoleError = jest.spyOn(console, 'error').mockImplementation();
  });

  beforeEach(() => {
    // Clear any existing mock server configuration
    nock.cleanAll();
    mockConsoleError.mockClear();
  });

  afterAll(() => {
    // Clean up any remaining nock interceptors
    nock.cleanAll();
  });

  jest.setTimeout(30_000);
  it('gives up after all retries fail with 500 errors with meaningful error', async () => {
    // Mock the server to always respond with 500 errors
    const fileName = `test-file-${uuid()}.exe`;
    nock('https://example.com')
      .get('/' + fileName)
      .reply(500);

    const targetDirectory = path.join(os.tmpdir());

    await downloadExecutable(
      targetDirectory,
      {
        filename: fileName,
        downloadUrl: 'https://example.com/' + fileName,
        backupUrl: 'https://example.com/' + fileName,
      },
      1,
    );

    // Assert that the file was not created
    const calls = mockConsoleError.mock.calls;
    expect(mockConsoleError).toBeCalledTimes(3);
    expect(calls[0]).toEqual([
      `Download of ${fileName} from main URL failed: HTTP 500`,
    ]);
    expect(calls[2]).toEqual([`All retries failed for ${fileName}: HTTP 500`]);
  });

  it('gives up after all retries fail with 404 errors with meaningful error', async () => {
    // Mock the server to always respond with 404 errors
    const fileName = `test-file-${uuid()}.exe`;
    nock('https://example.com')
      .get('/' + fileName)
      .reply(404);

    const targetDirectory = path.join(os.tmpdir());

    await downloadExecutable(
      targetDirectory,
      {
        filename: fileName,
        downloadUrl: 'https://example.com/' + fileName,
        backupUrl: 'https://example.com/' + fileName,
      },
      1,
    );

    // Assert that the file was not created
    const calls = mockConsoleError.mock.calls;
    expect(mockConsoleError).toBeCalledTimes(3);
    expect(calls[0]).toEqual([
      `Download of ${fileName} from main URL failed: HTTP 404`,
    ]);
    expect(calls[2]).toEqual([`All retries failed for ${fileName}: HTTP 404`]);
  });

  it('gives up after all retries fail with 404 errors with meaningful error', async () => {
    // Mock the server to always respond with 404 errors
    const fileName = `test-file-${uuid()}.exe`;
    nock('https://example.com')
      .get('/' + fileName)
      .times(2)
      .reply(404);

    const targetDirectory = path.join(os.tmpdir());

    await downloadExecutable(
      targetDirectory,
      {
        filename: fileName,
        downloadUrl: 'https://example.com/' + fileName,
        backupUrl: 'https://example.com/' + fileName,
      },
      1,
    );

    // Assert that the file was not created
    const calls = mockConsoleError.mock.calls;
    expect(mockConsoleError).toBeCalledTimes(3);
    expect(calls[0]).toEqual([
      `Download of ${fileName} from main URL failed: HTTP 404`,
    ]);
    expect(calls[1]).toEqual([
      `Download of ${fileName} from backup URL failed: HTTP 404`,
    ]);
    expect(calls[2]).toEqual([`All retries failed for ${fileName}: HTTP 404`]);
  });

  it('attempts to download from backup url when main url fails', async () => {
    // Mock the server to respond with 404 errors for the main URL
    const fileName = `test-file-${uuid()}.exe`;
    const fileContent = Buffer.from('This is a test file content');

    nock('https://example.com')
      .get('/' + fileName)
      .reply(404);

    // Mock the server to respond with 200 and actual file content for the backup URL
    nock('https://backup.example.com')
      .get('/' + fileName)
      .reply(200, fileContent, {
        'Content-Type': 'application/octet-stream',
        'Content-Length': fileContent.length.toString(),
      });

    const targetDirectory = path.join(os.tmpdir());

    await expect(
      downloadExecutable(
        targetDirectory,
        {
          filename: fileName,
          downloadUrl: 'https://example.com/' + fileName,
          backupUrl: 'https://backup.example.com/' + fileName,
        },
        1,
      ),
    ).resolves.not.toThrow();

    // Assert that the file was created
    const filePath = path.join(targetDirectory, fileName);
    expect(fs.existsSync(filePath)).toBe(true);

    // Assert that the console error was called for the main URL failure
    const calls = mockConsoleError.mock.calls;
    expect(mockConsoleError).toHaveBeenCalledTimes(1);
    expect(calls[0]).toEqual([
      `Download of ${fileName} from main URL failed: HTTP 404`,
    ]);

    // Clean up: remove the downloaded file
    fs.unlinkSync(filePath);
  });
});
