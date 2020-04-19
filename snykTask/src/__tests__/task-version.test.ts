test("ensure we can read the version from the task.json file", () => {
  const mockFn = jest.fn().mockReturnValue(`{
        "id": "some-id",
        "name": "SnykSecurityScan",
        "friendlyName": "Snyk Security Scan",
        "description": "Azure Pipelines Task for Snyk",
        "helpMarkDown": "",
        "category": "Utility",
        "author": "Snyk",
        "version": {
          "Major": 1,
          "Minor": 2,
          "Patch": 3
        },
        "instanceNameFormat": "Snyk scan for open source vulnerabilities"
    }`);

  jest.doMock("fs", () => {
    return {
      readFileSync: mockFn
    };
  });

  const taskVersionModule = require("../task-version");
  const v: string = taskVersionModule.getTaskVersion("./snykTask/task.json");
  expect(v).toBe("1.2.3");
  expect(mockFn).toHaveBeenCalledTimes(1);
});
