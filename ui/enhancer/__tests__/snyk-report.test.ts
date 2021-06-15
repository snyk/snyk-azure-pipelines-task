/*
  Tread carefully
  ===============

  snyk-report.ts is importing (global) Azure dependencies that don't exists in this project
  thus TS compilation may fail on them, making it impossible for Jest to mock them
*/

import { generateReportTitle } from '../generate-report-title';

describe('SnykReportTab UI', () => {
  describe('generateReportTitle', () => {
    test('handling of single project without vulns', () => {
      const jsonResults = {
        packageManager: 'nuget',
        uniqueCount: 0,
      };
      const title = generateReportTitle(
        jsonResults,
        'report-2021-04-27T13-44-14.json',
      );
      expect(title).toEqual(
        'Snyk Test for nuget (report-2021-04-27 13:44:14) | No issues found',
      );
    });

    test('handling of single project with vulns', () => {
      const jsonResults = {
        packageManager: 'npm',
        uniqueCount: 3,
      };
      const title = generateReportTitle(
        jsonResults,
        'report-2021-04-27T13-44-14.json',
      );
      expect(title).toEqual(
        'Snyk Test for npm (report-2021-04-27 13:44:14) | Found 3 issues',
      );
    });

    test('handling of multiple projects with vulns', () => {
      const jsonResults = [
        {
          packageManager: 'npm',
          uniqueCount: 3,
        },
        {
          packageManager: 'npm',
          uniqueCount: 2,
        },
      ];
      const title = generateReportTitle(
        jsonResults,
        'report-2021-04-27T13-44-14.json',
      );
      expect(title).toEqual('Tested 2 npm projects | Found 5 issues');
    });

    test('handling of multiple projects with vulns', () => {
      const jsonResults = [
        {
          packageManager: 'ruby',
          uniqueCount: 3,
        },
        {
          packageManager: 'ruby',
          uniqueCount: 1,
        },
        {
          packageManager: 'yarn',
          uniqueCount: 0,
        },
        {
          packageManager: 'python',
          uniqueCount: 0,
        },
      ];
      const title = generateReportTitle(
        jsonResults,
        'report-2021-04-27T13-44-14.json',
      );
      expect(title).toEqual(
        'Tested 4 ruby/yarn/python projects | Found 4 issues',
      );
    });
  });
});
