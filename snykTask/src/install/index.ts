import { Platform } from "azure-pipelines-task-lib/task";
import * as fs from "fs";
import * as path from "path";
import * as https from "https";

export type Executable = {
  filename: string;
  downloadUrl: string;
};

export type SnykDownloads = {
  snyk: Executable;
  snykToHtml: Executable;
};

export function getSnykDownloadInfo(platform: Platform): SnykDownloads {
  const baseUrl = "https://static.snyk.io";

  const filenameSuffixes: Record<Platform, string> = {
    [Platform.Linux]: "linux",
    [Platform.Windows]: "win.exe",
    [Platform.MacOS]: "macos"
  };

  return {
    snyk: {
      filename: `snyk-${filenameSuffixes[platform]}`,
      downloadUrl: `${baseUrl}/cli/latest/snyk-${filenameSuffixes[platform]}`
    },
    snykToHtml: {
      filename: `snyk-to-html-${filenameSuffixes[platform]}`,
      downloadUrl: `${baseUrl}/snyk-to-html/latest/snyk-to-html-${filenameSuffixes[platform]}`
    }
  };
}

export async function downloadExecutable(
  targetDirectory: string,
  executable: Executable
) {
  const fileWriter = fs.createWriteStream(
    path.join(targetDirectory, executable.filename),
    {
      mode: 0o766
    }
  );
  return new Promise<void>((resolve, reject) => {
    https.get(executable.downloadUrl, response => {
      response.on("end", () => resolve());
      response.on("error", err => reject(err));
      response.pipe(fileWriter);
    });
  });
}
