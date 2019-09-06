import * as path from "path";
// import * as assert from "assert";
import * as ttm from "azure-pipelines-task-lib/mock-test";
import * as fs from "fs";

function getFullPathToTestConfig(testConfigFilename: string): string {
  let modifiedTestConfigFilename = testConfigFilename;
  if (testConfigFilename.endsWith(".ts")) {
    modifiedTestConfigFilename = testConfigFilename.replace(".ts", ".js");
  }
  const fullPath = path.join(
    __filename,
    "../../../dist/__tests__",
    modifiedTestConfigFilename
  );

  // verify that the file exists
  const exists: boolean = fs.existsSync(fullPath);
  expect(exists).toBe(true); // verify that the test-mock-config file exists

  return fullPath;
}

// test('getFullPathToTestConfig works right', () => {
//     expect(getFullPathToTestConfig('someTestConfig.js').endsWith('someTestConfig.js')).toBe(true);
//     expect(getFullPathToTestConfig('someTestConfig.ts').endsWith('someTestConfig.js')).toBe(true);
// });

test("basic smoke test - inputs are ok", () => {
  const testMockConfigPath = getFullPathToTestConfig(
    "_test-mock-config-basic-smoke-test.js"
  );
  const mockTestRunner: ttm.MockTestRunner = new ttm.MockTestRunner(
    testMockConfigPath
  );

  mockTestRunner.run();

  expect(mockTestRunner.succeeded).toBe(true); // 'should have succeeded'
  expect(mockTestRunner.warningIssues.length).toBe(0); // "should have no warnings");
  expect(mockTestRunner.errorIssues.length).toBe(0); // "should have no errors");

  expect(
    mockTestRunner.cmdlines["/usr/bin/sudo snyk auth some-authToken"]
  ).toBe(true);

  expect(
    mockTestRunner.cmdlines["/usr/bin/sudo snyk test --someAdditionalArgs"]
  ).toBe(true);

  expect(
    mockTestRunner.cmdlines[
      "/usr/bin/sudo snyk monitor --org=some-snyk-org --project-name=some-project-name --someAdditionalArgs"
    ]
  ).toBe(true);
});

test("basic smoke test for container test - inputs are ok", () => {
  const testMockConfigPath = getFullPathToTestConfig(
    "_test-mock-config-basic-smoke-test-docker.js"
  );
  const mockTestRunner: ttm.MockTestRunner = new ttm.MockTestRunner(
    testMockConfigPath
  );

  mockTestRunner.run();

  expect(mockTestRunner.succeeded).toBe(true); // 'should have succeeded'
  expect(mockTestRunner.warningIssues.length).toBe(0); // "should have no warnings");
  expect(mockTestRunner.errorIssues.length).toBe(0); // "should have no errors");

  expect(
    mockTestRunner.cmdlines["/usr/bin/sudo snyk auth some-authToken"]
  ).toBe(true);

  expect(
    mockTestRunner.cmdlines[
      "/usr/bin/sudo snyk test --docker myImage --file=Dockerfile --someAdditionalArgs"
    ]
  ).toBe(true);

  expect(
    mockTestRunner.cmdlines[
      "/usr/bin/sudo snyk monitor --docker myImage --file=Dockerfile --org=some-snyk-org --project-name=some-project-name --someAdditionalArgs"
    ]
  ).toBe(true);
});

// test that it doesn't fail if the project-name input is not specified
test("doesn't fail if project-name is not specified", () => {
  const testMockConfigPath = getFullPathToTestConfig(
    "_test-mock-config-no-project-name.js"
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

// test that it doesn't fail if the severity-threshold is set
test("doesn't fail if severity-threshold is specified", () => {
  const testMockConfigPath = getFullPathToTestConfig(
    "_test-mock-config-with-severity-threshold.js"
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
    testMockRunner.cmdlines["/usr/bin/sudo snyk test --severity-threshold=high"]
  ).toBe(true);
});

// test that it doesn't fail if the severity-threshold is null
test("doesn't fail if severity-threshold is not specified", () => {
  const testMockConfigPath = getFullPathToTestConfig(
    "_test-mock-config-with-null-severity-threshold.js"
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

// test that it fails on invalid severity-threshold input
test("fails if severity-threshold is invalid", () => {
  const testMockConfigPath = getFullPathToTestConfig(
    "_test-mock-config-with-invalid-severity-threshold.js"
  );
  console.log(`testMockConfigPath: ${testMockConfigPath}`);
  const testMockRunner: ttm.MockTestRunner = new ttm.MockTestRunner(
    testMockConfigPath
  );

  testMockRunner.run();

  expect(testMockRunner.succeeded).toBe(false); // 'should have succeeded'
  console.log("warnings:");
  console.log(testMockRunner.warningIssues);
  console.log("errors:");
  console.log(testMockRunner.errorIssues);
  expect(testMockRunner.warningIssues.length).toBe(0); // "should have no warnings");
  expect(testMockRunner.errorIssues.length).toBe(1); // "should have no errors");
  expect(testMockRunner.errorIssues[0]).toBe(
    "If set, severity threshold must be 'high' or 'medium' or 'low' (case insensitive). If not set, the default is 'low'."
  );
});

// test that it doesn't fail if the additional-arguments is not set
test("doesn't fail if additional-arguments is not set", () => {
  const testMockConfigPath = getFullPathToTestConfig(
    "_test-mock-config-with-null-additional-arguments.js"
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

// test that snyk monitor is not called if monitor-on-build is false\
test("snyk monitor is not called if monitor-on-build is false", () => {
  const testMockConfigPath = getFullPathToTestConfig(
    "_test-mock-config-monitor-on-build-false.js"
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

// if fail-on-issues is false and snyk test finds issues, then the task should not fail
test("if fail-on-issues is false and snyk test finds issues, then the task should not fail", () => {
  const testMockConfigPath = getFullPathToTestConfig(
    "_test-mock-config-no-fail-task-if-snyk-finds-issues-but-fail-on-issues-is-false.js"
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

// if fail-on-issues is true and snyk test finds issues, then the task should fail
test("if fail-on-issues is true and snyk test finds issues, then the task should fail", () => {
  const testMockConfigPath = getFullPathToTestConfig(
    "_test-mock-config-no-fail-task-if-snyk-finds-issues-but-fail-on-issues-is-true.js"
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
test("if snyk test fails then snyk monitor should not run", () => {
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
test("test that if you set target-file that we use it ", () => {
  const testMockConfigPath = getFullPathToTestConfig(
    "_test-mock-config-use-target-file-if-specified.js"
  );
  const mockTestRunner: ttm.MockTestRunner = new ttm.MockTestRunner(
    testMockConfigPath
  );

  mockTestRunner.run();

  expect(mockTestRunner.succeeded).toBe(true); // 'should have succeeded'
  expect(mockTestRunner.warningIssues.length).toBe(0); // "should have no warnings");
  expect(mockTestRunner.errorIssues.length).toBe(0); // "should have no errors");

  expect(
    mockTestRunner.cmdlines["/usr/bin/sudo snyk test --file=some/dir/pom.xml"]
  ).toBe(true);
  expect(
    mockTestRunner.cmdlines[
      "/usr/bin/sudo snyk monitor --file=some/dir/pom.xml --org=some-snyk-org"
    ]
  ).toBe(true);
});
