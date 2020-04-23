import * as fs from "fs";

export function getTaskVersion(taskJsonPath: string): string {
  const taskJsonFile = fs.readFileSync(taskJsonPath, "utf8");
  const taskObj = JSON.parse(taskJsonFile);
  const versionObj = taskObj.version;

  const versionString = `${versionObj.Major}.${versionObj.Minor}.${versionObj.Patch}`;
  return versionString;
}
