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

import { Platform } from 'azure-pipelines-task-lib/task';
import { downloadToolWithRetries } from 'azure-pipelines-tool-lib/tool';
import { sanitizeVersionInput } from '../lib/sanitize-version-input';
import * as fs from 'fs';
import * as os from 'os';

export type Executable = {
  filename: string;
  downloadUrl: string;
  fallbackUrl: string;
};

export type SnykDownloads = {
  snyk: Executable;
  snykToHtml: Executable;
};

export function getSnykDownloadInfo(
  platform: Platform,
  versionString: string = 'stable',
): SnykDownloads {
  console.log(
    `Getting Snyk download info for platform: ${platform} version: ${versionString}`,
  );

  const baseUrl = 'https://downloads.snyk.io';
  const fallbackUrl = 'https://static.snyk.io';
  const distributionChannel = sanitizeVersionInput(versionString);

  const filenameSuffixes: Record<Platform, string> = {
    [Platform.Linux]: 'linux',
    [Platform.Windows]: 'win.exe',
    [Platform.MacOS]: 'macos',
  };

  return {
    snyk: {
      filename: `snyk-${filenameSuffixes[platform]}`,
      downloadUrl: `${baseUrl}/cli/${distributionChannel}/snyk-${filenameSuffixes[platform]}?utm_source=AZURE_PIPELINES`,
      fallbackUrl: `${fallbackUrl}/cli/latest/snyk-${filenameSuffixes[platform]}`,
    },
    snykToHtml: {
      filename: `snyk-to-html-${filenameSuffixes[platform]}`,
      downloadUrl: 'https://httpbin.org/status/503',
      fallbackUrl: 'https://httpbin.org/status/503',
    },
  };
}

export async function downloadExecutable(
  executable: Executable,
): Promise<string> {
  try {
    // https://downloads.snyk.io
    return await download(executable.downloadUrl, executable.filename);
  } catch (err) {
    console.error(
      `Download of ${executable.filename} from ${executable.downloadUrl} failed: ${err.message}`,
    );
  }

  try {
    // https://static.snyk.io
    return await download(executable.fallbackUrl, executable.filename);
  } catch (err) {
    console.error(
      `Download of ${executable.filename} from ${executable.fallbackUrl} failed: ${err.message}`,
    );

    throw err;
  }
}

async function download(
  downloadUrl: string,
  fileName: string,
  maxRetries: number = 5,
) {
  console.log(`Downloading: ${fileName} from: ${downloadUrl} with retries.`);
  const filePath = await downloadToolWithRetries(
    downloadUrl,
    fileName,
    [],
    {},
    maxRetries,
  );
  console.log(`Downloaded executable to: ${filePath}`);

  // the azure-pipelines-tool-lib/tool is not setting the executable permissions on the downloaded files for Unix
  setExecutablePermissions(filePath);

  return filePath;
}

function setExecutablePermissions(filePath: string) {
  if (os.platform() !== 'win32') {
    fs.chmodSync(filePath, 0o755);
    console.log(`Set executable permissions for ${filePath}`);
  }
}
