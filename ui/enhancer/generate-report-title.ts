import { detectVulns } from './detect-vulns';

export function generateReportTitle(
  jsonResults: object | any[],
  attachmentName: string, // timestamp e.g., 'report-2021-04-27T13-44-14.json'
): string {
  const vulnsFound = detectVulns(jsonResults);

  // --all-projects flag may return results in an array
  if (Array.isArray(jsonResults)) {
    const vulnsCount: number = jsonResults.reduce(
      (issuesFound, result): number =>
        result.uniqueCount ? issuesFound + result.uniqueCount : issuesFound,
      0,
    );
    const uniquePackageManagers = Array.from(
      new Set(
        jsonResults.map((result) => result.packageManager).filter(Boolean),
      ),
    ).join('/');

    let titleText = `Tested ${jsonResults.length} ${uniquePackageManagers} projects`;
    if (vulnsFound) {
      titleText += ` | Found ${vulnsCount} issue${vulnsCount === 1 ? '' : 's'}`;
    } else {
      titleText += ` | No issues found`;
    }

    return titleText;
  }

  // Single project scan results
  let titleText = '';
  if (jsonResults['docker'] && jsonResults['docker']['baseImage']) {
    titleText = `Snyk Test for ${
      jsonResults['docker']['baseImage']
    } (${formatReportName(attachmentName)})`;
  }

  if (jsonResults['packageManager']) {
    titleText = `Snyk Test for ${
      jsonResults['packageManager']
    } (${formatReportName(attachmentName)})`;
  }

  if (jsonResults['uniqueCount'] && jsonResults['uniqueCount'] > 0) {
    titleText += ` | Found ${jsonResults['uniqueCount']} issues`;
  } else {
    titleText += ` | No issues found`;
  }

  return titleText;
}

function formatReportName(
  name: string /* timestamp e.g., 'report-2021-04-27T13-44-14.json' */,
): string {
  const reportName = name.split('.')[0];
  const tmpName = reportName.split('T');
  return `${tmpName[0]} ${tmpName[1].replace(/-/g, ':')}`;
}
