
const fs = require("fs");

console.log("Replacing version snykTask/task.json file...");
// Get version from argument
const version = process.argv[2];
if (!version.match(/[0-9]+\.[0-9]+\.[0-9]+/)) {
  console.log("Invalid version: ", version);
  process.exitCode = 1;
  process.exit();
}

const taskId = process.env.AZ_DEV_TASK_ID; // don't use the production GUID for dev/test deploys
const taskName = process.env.AZ_TASK_NAME;
const taskFriendlyName = process.env.AZ_TASK_FRIENDLY_NAME;

// Break version and create the JSON to be replaced
const metaVersion = version.split(".");
const taskVersion = {
  Major: metaVersion[0],
  Minor: metaVersion[1],
  Patch: metaVersion[2]
}
console.log("taskVersion: ", taskVersion);

// Replace version in the snykTask/task.json file
const filePath = "./snykTask/task.json";
const fileBakPath = "./snykTask/task.json.bak";
const taskJsonFileObj = JSON.parse(fs.readFileSync(filePath, "utf8"));
fs.writeFileSync(fileBakPath, JSON.stringify(taskJsonFileObj, null, 2), "utf8");

// update information
taskJsonFileObj["version"] = taskVersion;
taskJsonFileObj["id"] = taskId;
taskJsonFileObj["name"] = taskName;
taskJsonFileObj["friendlyName"] = taskFriendlyName;
fs.writeFileSync(filePath, JSON.stringify(taskJsonFileObj, null, 2), "utf8");

console.log("Version replaced in snykTask/task.json file");
