# Contributing

## Development
### Setup
Run `npm run build` in the root folder. All tooling prerequisites (Node.js, TypeScript etc.) can be seen [here](https://docs.microsoft.com/en-us/azure/devops/extend/develop/add-build-task?view=azure-devops#prerequisites) and should be installed.

### Test and Run
Unit tests can be run via `npm run test:unit` command.

To run the code, a GitHub PR against `develop` should be raised with the committed code to the branch PR. The PR runs deployment script with deploy to development environment. The script builds the code that's added as part of your change and installs it in Azure DevOps organization as an extension that can be added to run a pipeline.

### Local debugging

A number of environment variable are required for debugging, here's an example launch config for `VSCode` that sets mandatory parameters such as `AGENT_TEMPDIRECTORY`, `INPUT_failOnIssues` and `INPUT_authToken`

```
{
    "version": "0.2.0",
    "configurations": [
        {
            "type": "node",
            "request": "launch",
            "name": "Launch Program",
            "program": "${workspaceFolder}/snykTask/src/index.ts",
            "env": {
                "AGENT_TEMPDIRECTORY": "some/temp/path",
                "INPUT_failOnIssues": "true",
                "INPUT_authToken": "your-auth-token-guid-from-portal", 
                "INPUT_targetFile": "path-to-visual-studio-solution.sln", 
                "INPUT_organization": "your-org-guid-from-portal",
                "INPUT_monitorWhen": "never",
                "INPUT_severityThreshold": "low",
                "INPUT_failOnThreshold": "critical", 
                "NODE_OPTIONS": null
              },            
            "outFiles": [
                "${workspaceFolder}/**/*.js"
            ]
        }
    ]
}
```

## Release
The release process is fully-automated: all you need to do is create a PR to merge `develop` into `master` and call the PR `Merge develop into master for release`.

## Contributor Agreement
A pull-request will only be considered for merging into the upstream codebase after you have signed our [contributor agreement](https://github.com/snyk/snyk-azure-pipelines-task/blob/master/Contributor-Agreement.md), assigning us the rights to the contributed code and granting you a license to use it in return. If you submit a pull request, you will be prompted to review and sign the agreement with one click (we use [CLA assistant](https://cla-assistant.io/)).

## Commit messages

Commit messages must follow the [Angular-style](https://github.com/angular/angular.js/blob/master/CONTRIBUTING.md#commit-message-format) commit format (but excluding the scope).

i.e:

```text
fix: minified scripts being removed

Also includes tests
```

This will allow for the automatic changelog to generate correctly.

### Commit types

Must be one of the following:

* **feat**: A new feature
* **fix**: A bug fix
* **docs**: Documentation only changes
* **test**: Adding missing tests
* **chore**: Changes to the build process or auxiliary tools and libraries such as documentation generation
* **refactor**: A code change that neither fixes a bug nor adds a feature
* **style**: Changes that do not affect the meaning of the code (white-space, formatting, missing semi-colons, etc)
* **perf**: A code change that improves performance

To release a major you need to add `BREAKING CHANGE: ` to the start of the body and the detail of the breaking change.

## Code standards

Ensure that your code adheres to the included `.eslintrc` config by running `npm run test:checks`.

Fix any `prettier` violations reported before pushing by running `npm run format` 

## Sending pull requests

- add tests for newly added code (and try to mirror directory and file structure if possible) or fixes
- spell check
- PRs will not be code reviewed unless all tests are passing

*Important:* when fixing a bug, please commit a **failing test** first so that CI (or I can) can show the code failing. Once that commit is in place, then commit the bug fix, so that we can test *before* and *after*.
