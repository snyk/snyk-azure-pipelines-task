import * as ma from "azure-pipelines-task-lib/mock-answer";
import * as tmrm from "azure-pipelines-task-lib/mock-run";
import * as path from "path";

const taskPath = path.join(__dirname, "..", "index.js");
const tmr: tmrm.TaskMockRunner = new tmrm.TaskMockRunner(taskPath);

tmr.setInput("stepDisplayName", "some stepDisplayName");
tmr.setInput("authToken", "some-authToken");
// tmr.setInput("project-name", "some-project-name");
tmr.setInput("test-directory", "some/dir");
// tmr.setInput("target-file", "some/dir/pom.xml");
// tmr.setInput('organization', 'some-snyk-org');
tmr.setInput("severity-threshold", "");
tmr.setInput("fail-on-issues", "true");
tmr.setInput("monitor-on-build", "true");
// tmr.setInput('additional-arguments', '');
tmr.setInput("isTest", "true");

const answers: ma.TaskLibAnswers = {
  which: {
    ls: "/bin/ls",
    npm: "/usr/bin/npm",
    snyk: "/usr/bin/snyk",
    sudo: "/usr/bin/sudo"
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
    "/usr/bin/npm install -g snyk": {
      code: 0,
      stdout: "Ok"
    },
    "/usr/bin/sudo npm install -g snyk": {
      code: 0,
      stdout: "Ok"
    },
    "/usr/bin/snyk auth some-authToken": {
      code: 0,
      stdout: "Snyk CLI authorized!"
    },
    "/usr/bin/snyk test": {
      code: 0,
      stdout: "No issues found"
    },
    "/usr/bin/snyk monitor": {
      code: 0,
      stdout: "No issues found"
    }
  }
};

tmr.setAnswers(answers);

tmr.run();
