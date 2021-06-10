const fs = require('fs');

const filePath = './snykTask/task.json';
const fileBakPath = './snykTask/task.json.bak';

console.log('Recovery snykTask/task.json file...');
const taskJSON_File = JSON.parse(fs.readFileSync(fileBakPath, 'utf8'));
fs.writeFileSync(filePath, JSON.stringify(taskJSON_File, null, 2), 'utf8');
console.log('File recovered');
