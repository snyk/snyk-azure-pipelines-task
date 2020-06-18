import * as ma from "azure-pipelines-task-lib/mock-answer";
import * as tmrm from "azure-pipelines-task-lib/mock-run";
import * as path from "path";

const taskPath = path.join(__dirname, "..", "index.js");
const tmr: tmrm.TaskMockRunner = new tmrm.TaskMockRunner(taskPath);

tmr.setInput("stepDisplayName", "some stepDisplayName");
tmr.setInput("authToken", "some-authToken");
tmr.setInput("testDirectory", "some/dir");
tmr.setInput("organization", "some-snyk-org");
tmr.setInput("severityThreshold", "High");
tmr.setInput("failOnIssues", "true");
tmr.setInput("monitorOnBuild", "true");
tmr.setInput("isTest", "true");
tmr.setInput("testType", "app");

const answers: ma.TaskLibAnswers = {
  which: {
    ls: "/bin/ls",
    npm: "/usr/bin/npm",
    snyk: "/usr/bin/snyk",
    sudo: "/usr/bin/sudo",
    "snyk-to-html": "/usr/bin/snyk-to-html"
  },
  exec: {
    "/bin/ls -la": {
      code: 0,
      stdout: "(directory listing for `ls -la)"
    },
    "/bin/ls": {
      code: 0,
      stdout: "(directory listing)"
    },
    "/usr/bin/npm install -g snyk snyk-to-html": {
      code: 0,
      stdout: "Ok"
    },
    "/usr/bin/sudo npm install -g snyk snyk-to-html": {
      code: 0,
      stdout: "Ok"
    },
    "/usr/bin/snyk auth some-authToken": {
      code: 0,
      stdout: "Snyk CLI authorized!"
    },
    "/usr/bin/snyk test --severity-threshold=high --json-file-output=report.json": {
      code: 0,
      stdout: "Ok"
    },
    "/usr/bin/snyk-to-html -i report.json": {
      code: 0,
      stdout: "No issues found"
    },
    "/usr/bin/snyk monitor --org=some-snyk-org": {
      code: 0,
      stdout: "No issues found"
    }
  }
};

tmr.setAnswers(answers);

tmr.run();
