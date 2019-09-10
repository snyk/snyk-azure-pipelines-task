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
