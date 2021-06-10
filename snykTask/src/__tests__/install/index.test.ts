import { getSnykDownloadInfo, downloadExecutable } from "../../install";
import { Platform } from "azure-pipelines-task-lib/task";

describe("getSnykDownloadInfo", () => {
  it("retrieves the correct download info for Linux", () => {
    const dlInfo = getSnykDownloadInfo(Platform.Linux);
    expect(dlInfo).toEqual({
      snyk: {
        filename: "snyk-linux",
        downloadUrl: "https://static.snyk.io/cli/latest/snyk-linux"
      },
      snykToHtml: {
        filename: "snyk-to-html-linux",
        downloadUrl:
          "https://static.snyk.io/snyk-to-html/latest/snyk-to-html-linux"
      }
    });
  });

  it("retrieves the correct download info for Windows", () => {
    const dlInfo = getSnykDownloadInfo(Platform.Windows);
    expect(dlInfo).toEqual({
      snyk: {
        filename: "snyk-win.exe",
        downloadUrl: "https://static.snyk.io/cli/latest/snyk-win.exe"
      },
      snykToHtml: {
        filename: "snyk-to-html-win.exe",
        downloadUrl:
          "https://static.snyk.io/snyk-to-html/latest/snyk-to-html-win.exe"
      }
    });
  });

  it("retrieves the correct download info for MacOS", () => {
    const dlInfo = getSnykDownloadInfo(Platform.MacOS);
    expect(dlInfo).toEqual({
      snyk: {
        filename: "snyk-macos",
        downloadUrl: "https://static.snyk.io/cli/latest/snyk-macos"
      },
      snykToHtml: {
        filename: "snyk-to-html-macos",
        downloadUrl:
          "https://static.snyk.io/snyk-to-html/latest/snyk-to-html-macos"
      }
    });
  });
});
