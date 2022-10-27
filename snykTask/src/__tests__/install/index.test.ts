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

import { getSnykDownloadInfo } from '../../install';
import { Platform } from 'azure-pipelines-task-lib/task';

describe('getSnykDownloadInfo', () => {
  it('retrieves the correct download info for Linux', () => {
    const dlInfo = getSnykDownloadInfo(Platform.Linux);
    expect(dlInfo).toEqual({
      snyk: {
        filename: 'snyk-linux',
        downloadUrl: 'https://static.snyk.io/cli/latest/snyk-linux',
      },
      snykToHtml: {
        filename: 'snyk-to-html-linux',
        downloadUrl:
          'https://static.snyk.io/snyk-to-html/latest/snyk-to-html-linux',
      },
    });
  });

  it('retrieves the correct download info for Windows', () => {
    const dlInfo = getSnykDownloadInfo(Platform.Windows);
    expect(dlInfo).toEqual({
      snyk: {
        filename: 'snyk-win.exe',
        downloadUrl: 'https://static.snyk.io/cli/latest/snyk-win.exe',
      },
      snykToHtml: {
        filename: 'snyk-to-html-win.exe',
        downloadUrl:
          'https://static.snyk.io/snyk-to-html/latest/snyk-to-html-win.exe',
      },
    });
  });

  it('retrieves the correct download info for MacOS', () => {
    const dlInfo = getSnykDownloadInfo(Platform.MacOS);
    expect(dlInfo).toEqual({
      snyk: {
        filename: 'snyk-macos',
        downloadUrl: 'https://static.snyk.io/cli/latest/snyk-macos',
      },
      snykToHtml: {
        filename: 'snyk-to-html-macos',
        downloadUrl:
          'https://static.snyk.io/snyk-to-html/latest/snyk-to-html-macos',
      },
    });
  });
});
