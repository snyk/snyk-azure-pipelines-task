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
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';

export type Executable = {
  filename: string;
  downloadUrl: string;
};

export type SnykDownloads = {
  snyk: Executable;
  snykToHtml: Executable;
};

export function getSnykDownloadInfo(platform: Platform): SnykDownloads {
  const baseUrl = 'https://static.snyk.io';

  const filenameSuffixes: Record<Platform, string> = {
    [Platform.Linux]: 'linux',
    [Platform.Windows]: 'win.exe',
    [Platform.MacOS]: 'macos',
  };

  return {
    snyk: {
      filename: `snyk-${filenameSuffixes[platform]}`,
      downloadUrl: `${baseUrl}/cli/latest/snyk-${filenameSuffixes[platform]}`,
    },
    snykToHtml: {
      filename: `snyk-to-html-${filenameSuffixes[platform]}`,
      downloadUrl: `${baseUrl}/snyk-to-html/latest/snyk-to-html-${filenameSuffixes[platform]}`,
    },
  };
}

export async function downloadExecutable(
  targetDirectory: string,
  executable: Executable,
  maxRetries = 5
) {
  const filePath = path.join(targetDirectory, executable.filename);

  // Check if the file already exists
  if (fs.existsSync(filePath)) {
    console.log(
      `File ${executable.filename} already exists, skipping download.`,
    );
    return;
  }

  const fileWriter = fs.createWriteStream(filePath, {
    mode: 0o766,
  });

  // Wrapping the download in a function for easy retrying
  const doDownload = () =>
    new Promise<void>((resolve, reject) => {
      https.get(executable.downloadUrl, (response) => {
        response.on('end', () => resolve());
        response.on('error', (err) => {
          console.error(
            `Download of ${executable.filename} failed: ${err.message}`,
          );
          reject(err);
        });
        response.pipe(fileWriter);
      });
    });

  // Try to download the file, retry up to `maxRetries` times if the attempt fails
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      await doDownload();
      console.log(`Download successful for ${executable.filename}`);
      break;
    } catch (err) {
      console.error(`Download of ${executable.filename} failed: ${err.message}`);

      // Don't wait before retrying the last attempt
      if (attempt < maxRetries - 1) {
        console.log(
          `Retrying download of ${executable.filename} after 5 seconds...`,
        );
        await new Promise((resolve) => setTimeout(resolve, 5000));
      } else {
        console.error(
          `All retries failed for ${executable.filename}: ${err.message}`,
        );
      }
    }
  }
}