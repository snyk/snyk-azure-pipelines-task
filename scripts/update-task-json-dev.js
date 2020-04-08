
const fs = require("fs");

console.log("Replacing version snykTask/task.json file...");
// Get version from argument
const version = process.argv[2];
if (!version.match(/[0-9]+\.[0-9]+\.[0-9]+/)) {
  console.log("Invalid version: ", version);
  process.exitCode = 1;
  process.exit();
}
const taskId = process.env.AZ_EXTENSION_ID;
const taskFriendlyName = process.env.AZ_EXTENSION_NAME

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
const taskJSON_File = JSON.parse(fs.readFileSync(filePath, "utf8"));
fs.writeFileSync(fileBakPath, JSON.stringify(taskJSON_File, null, 2), "utf8");

// update information
taskJSON_File["version"] = taskVersion;
taskJSON_File["id"] = taskId;
taskJSON_File["name"] = `Dev-${taskJSON_File["name"]}-${taskId}`;
taskJSON_File["friendlyName"] = taskFriendlyName;
fs.writeFileSync(filePath, JSON.stringify(taskJSON_File, null, 2), "utf8");
console.log("Version replaced in snykTask/task.json file");
