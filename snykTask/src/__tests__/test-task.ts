import * as path from "path";
import * as ttm from "azure-pipelines-task-lib/mock-test";
import * as fs from "fs";

const getFullPathToTestConfig = (testConfigFilename: string): string => {
  let modifiedTestConfigFilename = testConfigFilename;
  if (testConfigFilename.endsWith(".ts")) {
    modifiedTestConfigFilename = testConfigFilename.replace(".ts", ".js");
  }
  const fullPath = path.join(
    __filename,
    "../../../dist/__tests__/",
    modifiedTestConfigFilename
  );

  // verify that the file exists
  const exists: boolean = fs.existsSync(fullPath);
  expect(exists).toBe(true); // verify that the test-mock-config file exists

  return fullPath;
};

test("basic smoke test - inputs are ok", () => {
  const testMockConfigPath = getFullPathToTestConfig(
    "_test-mock-config-basic-smoke-test.js"
  );
  const mockTestRunner: ttm.MockTestRunner = new ttm.MockTestRunner(
    testMockConfigPath
  );

  mockTestRunner.run();

  expect(
    mockTestRunner.cmdlines["/usr/bin/sudo npm install -g snyk snyk-to-html"]
  ).toBe(true);
  expect(mockTestRunner.cmdlines["/usr/bin/snyk auth some-authToken"]).toBe(
    true
  );
  expect(
    mockTestRunner.cmdlines[
      "/usr/bin/snyk test --json-file-output=report.json --someAdditionalArgs"
    ]
  ).toBe(true);
  expect(mockTestRunner.cmdlines["/usr/bin/snyk-to-html -i report.json"]).toBe(
    true
  );
  expect(
    mockTestRunner.cmdlines[
      "/usr/bin/snyk monitor --org=some-snyk-org --project-name=some-projectName --someAdditionalArgs"
    ]
  ).toBe(true);

  expect(mockTestRunner.succeeded).toBe(true); // 'should have succeeded'
  expect(mockTestRunner.warningIssues.length).toBe(0); // "should have no warnings");
  expect(mockTestRunner.errorIssues.length).toBe(0); // "should have no errors");
});

test("basic smoke test for container test - inputs are ok", () => {
  const testMockConfigPath = getFullPathToTestConfig(
    "_test-mock-config-basic-smoke-test-docker.js"
  );
  const mockTestRunner: ttm.MockTestRunner = new ttm.MockTestRunner(
    testMockConfigPath
  );

  mockTestRunner.run();

  expect(mockTestRunner.cmdlines["/usr/bin/snyk auth some-authToken"]).toBe(
    true
  );
  expect(
    mockTestRunner.cmdlines[
      "/usr/bin/snyk test --docker myImage --file=Dockerfile --json-file-output=report.json --someAdditionalArgs"
    ]
  ).toBe(true);
  expect(mockTestRunner.cmdlines["/usr/bin/snyk-to-html -i report.json"]).toBe(
    true
  );
  expect(
    mockTestRunner.cmdlines[
      "/usr/bin/snyk monitor --docker myImage --file=Dockerfile --org=some-snyk-org --project-name=some-projectName --someAdditionalArgs"
    ]
  ).toBe(true);
  expect(mockTestRunner.succeeded).toBe(true); // 'should have succeeded'
  expect(mockTestRunner.warningIssues.length).toBe(0); // "should have no warnings");
  expect(mockTestRunner.errorIssues.length).toBe(0); // "should have no errors");
});

// test that it doesn't fail if the projectName input is not specified
test("doesn't fail if projectName is not specified", () => {
  const testMockConfigPath = getFullPathToTestConfig(
    "_test-mock-config-no-projectName.js"
  );
  console.log(`testMockConfigPath: ${testMockConfigPath}`);
  const testMockRunner: ttm.MockTestRunner = new ttm.MockTestRunner(
    testMockConfigPath
  );
  testMockRunner.run();

  expect(testMockRunner.succeeded).toBe(true); // 'should have succeeded'
  expect(testMockRunner.warningIssues.length).toBe(0); // "should have no warnings");
  expect(testMockRunner.errorIssues.length).toBe(0); // "should have no errors");
});

// test that it doesn't fail if the organization input is not specified
test("doesn't fail if organization is not specified", () => {
  const testMockConfigPath = getFullPathToTestConfig(
    "_test-mock-config-no-organization.js"
  );
  console.log(`testMockConfigPath: ${testMockConfigPath}`);
  const testMockRunner: ttm.MockTestRunner = new ttm.MockTestRunner(
    testMockConfigPath
  );

  testMockRunner.run();

  expect(testMockRunner.succeeded).toBe(true); // 'should have succeeded'
  expect(testMockRunner.warningIssues.length).toBe(0); // "should have no warnings");
  expect(testMockRunner.errorIssues.length).toBe(0); // "should have no errors");
});

// test that it doesn't fail if the severityThreshold is set
test("doesn't fail if severityThreshold is specified", () => {
  const testMockConfigPath = getFullPathToTestConfig(
    "_test-mock-config-with-severityThreshold.js"
  );
  console.log(`testMockConfigPath: ${testMockConfigPath}`);
  const testMockRunner: ttm.MockTestRunner = new ttm.MockTestRunner(
    testMockConfigPath
  );

  testMockRunner.run();

  expect(
    testMockRunner.cmdlines[
      "/usr/bin/snyk test --severity-threshold=high --json-file-output=report.json"
    ]
  ).toBe(true);
  expect(testMockRunner.succeeded).toBe(true); // 'should have succeeded'
  expect(testMockRunner.warningIssues.length).toBe(0); // "should have no warnings");
  expect(testMockRunner.errorIssues.length).toBe(0); // "should have no errors");
});

// test that it doesn't fail if the severityThreshold is null
test("doesn't fail if severityThreshold is not specified", () => {
  const testMockConfigPath = getFullPathToTestConfig(
    "_test-mock-config-with-null-severityThreshold.js"
  );
  console.log(`testMockConfigPath: ${testMockConfigPath}`);
  const testMockRunner: ttm.MockTestRunner = new ttm.MockTestRunner(
    testMockConfigPath
  );

  testMockRunner.run();

  expect(testMockRunner.succeeded).toBe(true); // 'should have succeeded'
  expect(testMockRunner.warningIssues.length).toBe(0); // "should have no warnings");
  expect(testMockRunner.errorIssues.length).toBe(0); // "should have no errors");
});

// test that it fails on invalid severityThreshold input
test("fails if severityThreshold is invalid", () => {
  const testMockConfigPath = getFullPathToTestConfig(
    "_test-mock-config-with-invalid-severityThreshold.js"
  );
  console.log(`testMockConfigPath: ${testMockConfigPath}`);
  const testMockRunner: ttm.MockTestRunner = new ttm.MockTestRunner(
    testMockConfigPath
  );

  testMockRunner.run();

  expect(testMockRunner.succeeded).toBe(false); // 'should have succeeded'
  expect(testMockRunner.warningIssues.length).toBe(0); // "should have no warnings");
  expect(testMockRunner.errorIssues.length).toBe(1); // "should have no errors");
  expect(testMockRunner.errorIssues[0]).toBe(
    "If set, severity threshold must be 'high' or 'medium' or 'low' (case insensitive). If not set, the default is 'low'."
  );

  const commandsCalled = Object.keys(testMockRunner.cmdlines);
  commandsCalled.forEach(cmd => {
    if (cmd.includes("snyk monitor")) {
      fail("snyk monitor should not be run");
    }
    if (cmd.includes("snyk test")) {
      fail("snyk monitor should not be run");
    }
  });
});

// test that it doesn't fail if the additionalArguments is not set
test("doesn't fail if additionalArguments is not set", () => {
  const testMockConfigPath = getFullPathToTestConfig(
    "_test-mock-config-with-null-additionalArguments.js"
  );

  console.log(`testMockConfigPath: ${testMockConfigPath}`);
  const testMockRunner: ttm.MockTestRunner = new ttm.MockTestRunner(
    testMockConfigPath
  );

  testMockRunner.run();

  expect(testMockRunner.succeeded).toBe(true); // 'should have succeeded'
  expect(testMockRunner.warningIssues.length).toBe(0); // "should have no warnings");
  expect(testMockRunner.errorIssues.length).toBe(0); // "should have no errors");
});

// test that snyk monitor is not called if monitorOnBuild is false\
test("snyk monitor is not called if monitorOnBuild is false", () => {
  const testMockConfigPath = getFullPathToTestConfig(
    "_test-mock-config-monitorOnBuild-false.js"
  );
  console.log(`testMockConfigPath: ${testMockConfigPath}`);
  const testMockRunner: ttm.MockTestRunner = new ttm.MockTestRunner(
    testMockConfigPath
  );

  testMockRunner.run();

  expect(testMockRunner.succeeded).toBe(true); // 'should have succeeded'
  expect(testMockRunner.warningIssues.length).toBe(0); // "should have no warnings");
  expect(testMockRunner.errorIssues.length).toBe(0); // "should have no errors");

  const commandsCalled = Object.keys(testMockRunner.cmdlines);
  commandsCalled.forEach(cmd => {
    if (cmd.includes("snyk monitor")) {
      fail("snyk monitor should not be run");
    }
  });
});

// if failOnIssues is false and snyk test finds issues, then the task should not fail
test("if failOnIssues is false and snyk test finds issues, then the task should not fail and snyk monitor should run", () => {
  const testMockConfigPath = getFullPathToTestConfig(
    "_test-mock-config-no-fail-task-if-snyk-finds-issues-but-failOnIssues-is-false.js"
  );
  console.log(`testMockConfigPath: ${testMockConfigPath}`);
  const testMockRunner: ttm.MockTestRunner = new ttm.MockTestRunner(
    testMockConfigPath
  );

  testMockRunner.run();

  expect(testMockRunner.succeeded).toBe(true); // 'should have succeeded'
  expect(testMockRunner.warningIssues.length).toBe(0); // "should have no warnings");
  expect(testMockRunner.errorIssues.length).toBe(0); // "should have no errors");

  expect(
    testMockRunner.cmdlines[
      "/usr/bin/snyk monitor --project-name=someProjectName"
    ]
  ).toBe(true);
});

// if failOnIssues is true and snyk test finds issues, then the task should fail
test("if failOnIssues is true and snyk test finds issues, then the task should fail", () => {
  const testMockConfigPath = getFullPathToTestConfig(
    "_test-mock-config-no-fail-task-if-snyk-finds-issues-but-failOnIssues-is-true.js"
  );
  console.log(`testMockConfigPath: ${testMockConfigPath}`);
  const testMockRunner: ttm.MockTestRunner = new ttm.MockTestRunner(
    testMockConfigPath
  );

  testMockRunner.run();

  expect(testMockRunner.succeeded).toBe(false);
  expect(testMockRunner.warningIssues.length).toBe(0);
  expect(testMockRunner.errorIssues.length).toBe(1);
  expect(testMockRunner.errorIssues[0]).toBe(
    "failing task because `snyk test` found issues"
  );
});

// make sure that snyk monitor does not run if snyk test fails
test("if snyk test fails then snyk monitor should not run", () => {
  const testMockConfigPath = getFullPathToTestConfig(
    "_test-mock-config-no-snyk-monitor-if-snyk-test-fails.js"
  );
  console.log(`testMockConfigPath: ${testMockConfigPath}`);
  const testMockRunner: ttm.MockTestRunner = new ttm.MockTestRunner(
    testMockConfigPath
  );

  testMockRunner.run();

  expect(testMockRunner.succeeded).toBe(false);
  expect(testMockRunner.warningIssues.length).toBe(0);
  expect(testMockRunner.errorIssues.length).toBe(1);
  expect(testMockRunner.errorIssues[0]).toBe(
    "failing task because `snyk test` found issues"
  );

  const commandsCalled = Object.keys(testMockRunner.cmdlines);
  commandsCalled.forEach(cmd => {
    if (cmd.includes("snyk monitor")) {
      fail("snyk monitor should not be run");
    }
  });
});

// make sure that if snyk test fails for a reason other than issues being found that the error messaging indicates
// this and that snyk monitor does not run.
test("if snyk test fails then snyk monitor should not run if snyk test fails for reasons other than issues found", () => {
  const testMockConfigPath = getFullPathToTestConfig(
    "_test-mock-config-snyk-test-fails-for-reasons-other-than-issues-found.ts"
  );
  console.log(`testMockConfigPath: ${testMockConfigPath}`);
  const testMockRunner: ttm.MockTestRunner = new ttm.MockTestRunner(
    testMockConfigPath
  );

  testMockRunner.run();

  expect(testMockRunner.succeeded).toBe(false);
  expect(testMockRunner.warningIssues.length).toBe(0);
  expect(testMockRunner.errorIssues.length).toBe(1);
  expect(testMockRunner.errorIssues[0]).toBe(
    "failing task because `snyk test` was improperly used or had other errors"
  );

  const commandsCalled = Object.keys(testMockRunner.cmdlines);
  commandsCalled.forEach(cmd => {
    if (cmd.includes("snyk monitor")) {
      fail("snyk monitor should not be run");
    }
  });
});

// test that the --file= thing works
test("test that if you set targetFile that we use it ", () => {
  const testMockConfigPath = getFullPathToTestConfig(
    "_test-mock-config-use-targetFile-if-specified.js"
  );
  const mockTestRunner: ttm.MockTestRunner = new ttm.MockTestRunner(
    testMockConfigPath
  );

  mockTestRunner.run();

  expect(
    mockTestRunner.cmdlines[
      "/usr/bin/snyk test --file=some/dir/pom.xml --json-file-output=report.json"
    ]
  ).toBe(true);
  expect(
    mockTestRunner.cmdlines[
      "/usr/bin/snyk monitor --file=some/dir/pom.xml --org=some-snyk-org"
    ]
  ).toBe(true);
  expect(mockTestRunner.succeeded).toBe(true); // 'should have succeeded'
  expect(mockTestRunner.warningIssues.length).toBe(0); // "should have no warnings");
  expect(mockTestRunner.errorIssues.length).toBe(0); // "should have no errors");
});

test("test that the task fails appropriately if no auth token is set", () => {
  const testMockConfigPath = getFullPathToTestConfig(
    "_test-mock-config-no-auth-token.js"
  );
  const mockTestRunner: ttm.MockTestRunner = new ttm.MockTestRunner(
    testMockConfigPath
  );

  mockTestRunner.run();

  expect(mockTestRunner.succeeded).toBe(false);
  expect(mockTestRunner.warningIssues.length).toBe(0);
  expect(mockTestRunner.errorIssues.length).toBe(1);
  expect(mockTestRunner.errorIssues[0]).toBe(
    "auth token is not set. Setup SnykAuth service connection and specify serviceConnectionEndpoint input parameter."
  );
});

test("if snyk monitor fails we get an appropriate message - unknown file", () => {
  const testMockConfigPath = getFullPathToTestConfig(
    "_test-mock-config-snyk-monitor-fails-because-unknown-file.ts"
  );
  console.log(`testMockConfigPath: ${testMockConfigPath}`);
  const testMockRunner: ttm.MockTestRunner = new ttm.MockTestRunner(
    testMockConfigPath
  );

  testMockRunner.run();

  expect(testMockRunner.succeeded).toBe(false);
  expect(testMockRunner.warningIssues.length).toBe(0);
  expect(testMockRunner.errorIssues.length).toBe(1);
  expect(testMockRunner.errorIssues[0]).toBe(
    "failing task because `snyk monitor` had an error - unknown file or image"
  );
});

test("if snyk monitor fails we get an appropriate message - other error file", () => {
  const testMockConfigPath = getFullPathToTestConfig(
    "_test-mock-config-snyk-monitor-fails-because-unknown-error.ts"
  );
  console.log(`testMockConfigPath: ${testMockConfigPath}`);
  const testMockRunner: ttm.MockTestRunner = new ttm.MockTestRunner(
    testMockConfigPath
  );

  testMockRunner.run();

  expect(testMockRunner.succeeded).toBe(false);
  expect(testMockRunner.warningIssues.length).toBe(0);
  expect(testMockRunner.errorIssues.length).toBe(1);
  expect(testMockRunner.errorIssues[0]).toBe(
    "failing task because `snyk monitor` had an error"
  );
});
