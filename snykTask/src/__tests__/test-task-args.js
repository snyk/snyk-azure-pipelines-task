/* This test is in JS not TS because I need to be able to set args.targetFile and args.dockerFilePath to null
   to simulate the case where Azure returns null from getInput() when the corresponding input paremters
   are not set and I can't do that in TypeScript without modifying the tsconfig.js to have "strictNullChecks": false
   which I don't want to do. */

const ta = require("../task-args");

// Azure's getInput() returns nulls for inputs which are not set. Make sure they don't result in NPEs in the task args parsing.
test("ensure no problems if both targetFile and docker-file-path are both not set", () => {
  const args = new ta.TaskArgs();
  args.dockerImageName = "some-docker-image";
  args.targetFile = null;
  args.dockerfilePath = null;

  const fileArg = args.getFileParameter();
  console.log(`fileArg: ${fileArg}`);
  if (fileArg == null) {
    console.log("fileArg is null");
  }

  expect(fileArg).toBe("");
});

test("if dockerImageName is specified and (dockerfilePath is not specified but targetFile is and does not contain 'Dockerfile') then return empty string", () => {
  const args = new ta.TaskArgs();
  args.dockerImageName = "some-docker-image";
  args.targetFile = "should/not/be/set.pom";
  args.dockerfilePath = null;

  const fileArg = args.getFileParameter();
  console.log(`fileArg: ${fileArg}`);
  if (fileArg == null) {
    console.log("fileArg is null");
  }

  expect(fileArg).toBe("");
});

test("if dockerImageName is specified and (dockerfilePath is not specified but targetFile is and contains 'Dockerfile') then use targetFile", () => {
  const args = new ta.TaskArgs();
  args.dockerImageName = "some-docker-image";
  args.targetFile = "my/Dockerfile";
  args.dockerfilePath = null;

  const fileArg = args.getFileParameter();
  console.log(`fileArg: ${fileArg}`);
  if (fileArg == null) {
    console.log("fileArg is null");
  }

  expect(fileArg).toBe("my/Dockerfile");
});

test("if dockerImageName is set and both targetFile and dockerfilePath are set, use dockerfilePath", () => {
  const args = new ta.TaskArgs();
  args.dockerImageName = "some-docker-image";
  args.targetFile = "bad/Dockerfile";
  args.dockerfilePath = "good/Dockerfile";

  const fileArg = args.getFileParameter();
  console.log(`fileArg: ${fileArg}`);
  if (fileArg == null) {
    console.log("fileArg is null");
  }

  expect(fileArg).toBe("good/Dockerfile");
});

test("ensure that ignoreUnknownCA is false by default", () => {
  const args = new ta.TaskArgs();
  expect(args.ignoreUnknownCA).toBe(false);
});

test("ensure that noSudo is false by default", () => {
  const args = new ta.TaskArgs();
  expect(args.noSudo).toBe(false);
});
