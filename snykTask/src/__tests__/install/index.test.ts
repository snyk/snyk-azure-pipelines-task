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

describe('getSnykDownloadInfo', () => {
  it('retrieves the correct download info for Linux', () => {
    const dlInfo = getSnykDownloadInfo(Platform.Linux);
    expect(dlInfo).toEqual({
      snyk: {
        filename: 'snyk-linux',
        downloadUrl:
          'https://downloads.snyk.io/cli/stable/snyk-linux?utm_source=AZURE_PIPELINES',
        fallbackUrl: 'https://static.snyk.io/cli/latest/snyk-linux',
      },
      snykToHtml: {
        filename: 'snyk-to-html-linux',
        downloadUrl:
          'https://downloads.snyk.io/snyk-to-html/latest/snyk-to-html-linux?utm_source=AZURE_PIPELINES',
        fallbackUrl:
          'https://static.snyk.io/snyk-to-html/latest/snyk-to-html-linux',
      },
    });
  });

  it('retrieves the correct download info for Windows', () => {
    const dlInfo = getSnykDownloadInfo(Platform.Windows);
    expect(dlInfo).toEqual({
      snyk: {
        filename: 'snyk-win.exe',
        downloadUrl:
          'https://downloads.snyk.io/cli/stable/snyk-win.exe?utm_source=AZURE_PIPELINES',
        fallbackUrl: 'https://static.snyk.io/cli/latest/snyk-win.exe',
      },
      snykToHtml: {
        filename: 'snyk-to-html-win.exe',
        downloadUrl:
          'https://downloads.snyk.io/snyk-to-html/latest/snyk-to-html-win.exe?utm_source=AZURE_PIPELINES',
        fallbackUrl:
          'https://static.snyk.io/snyk-to-html/latest/snyk-to-html-win.exe',
      },
    });
  });

  it('retrieves the correct download info for MacOS', () => {
    const dlInfo = getSnykDownloadInfo(Platform.MacOS);
    expect(dlInfo).toEqual({
      snyk: {
        filename: 'snyk-macos',
        downloadUrl:
          'https://downloads.snyk.io/cli/stable/snyk-macos?utm_source=AZURE_PIPELINES',
        fallbackUrl: 'https://static.snyk.io/cli/latest/snyk-macos',
      },
      snykToHtml: {
        filename: 'snyk-to-html-macos',
        downloadUrl:
          'https://downloads.snyk.io/snyk-to-html/latest/snyk-to-html-macos?utm_source=AZURE_PIPELINES',
        fallbackUrl:
          'https://static.snyk.io/snyk-to-html/latest/snyk-to-html-macos',
      },
    });
  });

  it('retrieves the correct download info a preview release', () => {
    const dlInfo = getSnykDownloadInfo(Platform.MacOS, 'preview ');
    expect(dlInfo).toEqual({
      snyk: {
        filename: 'snyk-macos',
        downloadUrl:
          'https://downloads.snyk.io/cli/preview/snyk-macos?utm_source=AZURE_PIPELINES',
        fallbackUrl: 'https://static.snyk.io/cli/latest/snyk-macos',
      },
      snykToHtml: {
        filename: 'snyk-to-html-macos',
        downloadUrl:
          'https://downloads.snyk.io/snyk-to-html/latest/snyk-to-html-macos?utm_source=AZURE_PIPELINES',
        fallbackUrl:
          'https://static.snyk.io/snyk-to-html/latest/snyk-to-html-macos',
      },
    });
  });

  it('retrieves the correct download info for a valid semver', () => {
    const dlInfo = getSnykDownloadInfo(Platform.MacOS, '1.1287.0');
    expect(dlInfo).toEqual({
      snyk: {
        filename: 'snyk-macos',
        downloadUrl:
          'https://downloads.snyk.io/cli/v1.1287.0/snyk-macos?utm_source=AZURE_PIPELINES',
        fallbackUrl: 'https://static.snyk.io/cli/latest/snyk-macos',
      },
      snykToHtml: {
        filename: 'snyk-to-html-macos',
        downloadUrl:
          'https://downloads.snyk.io/snyk-to-html/latest/snyk-to-html-macos?utm_source=AZURE_PIPELINES',
        fallbackUrl:
          'https://static.snyk.io/snyk-to-html/latest/snyk-to-html-macos',
      },
    });
  });

  it('retrieves the correct download info for a valid semver and sanitizes input', () => {
    const dlInfo = getSnykDownloadInfo(Platform.MacOS, 'v1.1287.0  ');
    expect(dlInfo).toEqual({
      snyk: {
        filename: 'snyk-macos',
        downloadUrl:
          'https://downloads.snyk.io/cli/v1.1287.0/snyk-macos?utm_source=AZURE_PIPELINES',
        fallbackUrl: 'https://static.snyk.io/cli/latest/snyk-macos',
      },
      snykToHtml: {
        filename: 'snyk-to-html-macos',
        downloadUrl:
          'https://downloads.snyk.io/snyk-to-html/latest/snyk-to-html-macos?utm_source=AZURE_PIPELINES',
        fallbackUrl:
          'https://static.snyk.io/snyk-to-html/latest/snyk-to-html-macos',
      },
    });
  });

  it('ignores invalid versions', () => {
    const dlInfo = getSnykDownloadInfo(Platform.MacOS, 'invalid-channel');
    expect(dlInfo).toEqual({
      snyk: {
        filename: 'snyk-macos',
        downloadUrl:
          'https://downloads.snyk.io/cli/stable/snyk-macos?utm_source=AZURE_PIPELINES',
        fallbackUrl: 'https://static.snyk.io/cli/latest/snyk-macos',
      },
      snykToHtml: {
        filename: 'snyk-to-html-macos',
        downloadUrl:
          'https://downloads.snyk.io/snyk-to-html/latest/snyk-to-html-macos?utm_source=AZURE_PIPELINES',
        fallbackUrl:
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
        fallbackUrl: '',
      },
      1,
    );

    // Assert that the file was not created
    const calls = mockConsoleError.mock.calls;
    console.log(mockConsoleError.mock.calls);
    expect(mockConsoleError).toBeCalledTimes(4);
    expect(calls[0]).toEqual([`Download of ${fileName} failed: HTTP 500`]);
    expect(calls[1]).toEqual([
      `All retries failed for ${fileName} from https://example.com/${fileName}: HTTP 500`,
    ]);
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
        fallbackUrl: '' + fileName,
      },
      1,
    );

    // Assert that the file was not created
    const calls = mockConsoleError.mock.calls;
    expect(mockConsoleError).toBeCalledTimes(4);
    expect(calls[0]).toEqual([`Download of ${fileName} failed: HTTP 404`]);
    expect(calls[1]).toEqual([
      `All retries failed for ${fileName} from https://example.com/${fileName}: HTTP 404`,
    ]);
  });
});
