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
import { sanitizeVersionInput } from '../lib/sanitize-version-input';

export type Executable = {
  filename: string;
  downloadUrl: string;
  backupUrl: string;
};

export type SnykDownloads = {
  snyk: Executable;
  snykToHtml: Executable;
};

export function getSnykDownloadInfo(
  platform: Platform,
  versionString: string = 'stable',
): SnykDownloads {
  const baseUrl = 'https://downloads.snyk.io';
  const backupUrl = 'https://static.snyk.io';
  const distributionChannel = sanitizeVersionInput(versionString);

  const filenameSuffixes: Record<Platform, string> = {
    [Platform.Linux]: 'linux',
    [Platform.Windows]: 'win.exe',
    [Platform.MacOS]: 'macos',
  };

  return {
    snyk: {
      filename: `snyk-${filenameSuffixes[platform]}`,
      downloadUrl: `${baseUrl}/cli/${distributionChannel}/snyk-${filenameSuffixes[platform]}?utm_source=AZURE_DEVOPS`,
      backupUrl: `${backupUrl}/cli/${distributionChannel}/snyk-${filenameSuffixes[platform]}`,
    },
    snykToHtml: {
      filename: `snyk-to-html-${filenameSuffixes[platform]}`,
      downloadUrl: `${baseUrl}/snyk-to-html/latest/snyk-to-html-${filenameSuffixes[platform]}?utm_source=AZURE_DEVOPS`,
      backupUrl: `${backupUrl}/snyk-to-html/latest/snyk-to-html-${filenameSuffixes[platform]}`,
    },
  };
}

export async function downloadExecutable(
  targetDirectory: string,
  executable: Executable,
  maxRetries = 5,
) {
  const filePath = path.join(targetDirectory, executable.filename);

  if (fs.existsSync(filePath)) {
    console.log(
      `File ${executable.filename} already exists, skipping download.`,
    );
    return;
  }

  const doDownload = (url: string) =>
    new Promise<void>((resolve, reject) => {
      const fileWriter = fs.createWriteStream(filePath, { mode: 0o766 });

      https
        .get(url, (response) => {
          if (response.statusCode !== 200) {
            fileWriter.close();
            reject(new Error(`HTTP ${response.statusCode}`));
            return;
          }

          response.pipe(fileWriter);

          fileWriter.on('finish', () => {
            fileWriter.close();
            console.log(`File ${executable.filename} saved to ${filePath}`);
            resolve();
          });
        })
        .on('error', (err) => {
          fileWriter.close();
          fs.unlinkSync(filePath); // Delete partially downloaded file
          reject(err);
        });
    });

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      await doDownload(executable.downloadUrl);
      console.log(`Download successful for ${executable.filename}`);
      return; // Exit function on successful download
    } catch (err) {
      console.error(
        `Download of ${executable.filename} from main URL failed: ${err.message}! Attempting to download from backup URL...`,
      );

      try {
        await doDownload(executable.backupUrl);
        console.log(
          `Download successful for ${executable.filename} from backup URL`,
        );
        return; // Exit function on successful download from backup
      } catch (backupErr) {
        console.error(
          `Download of ${executable.filename} from backup URL failed: ${backupErr.message}`,
        );
      }

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
