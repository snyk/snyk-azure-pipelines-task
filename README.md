# snyk-azure-pipelines-task

This task/extension for Azure Pipelines allows you to easily run Snyk scans within your Azure Pipeline jobs. You will need to first [create a Snyk account](https://snyk.io/login). There are two major options:

- Snyk scan for vulnerable dependencies leveraging your project's manfiest files, for example `pom.xml`, `package.json`, etc.
- Snyk scan for container images. This will look at Docker images.

In addition to running a Snyk security scan, you also have the option to monitor your application / container, in which case the dependency tree or container image metadata will be posted to your Snyk account for ongoing monitoring.

## Requirements

This extension requires that Node.js and npm be installed on the build agent. These are available by default on all Microsoft-hosted build agents. However, if you are using a self-hosted build agent, you may need to explicitly activate Node.js and npm and ensure they are in your [PATH](<https://en.wikipedia.org/wiki/PATH_(variable)>). This can be done using the [NodeTool task from Microsoft](https://docs.microsoft.com/en-us/azure/devops/pipelines/tasks/tool/node-js?view=azure-devops) prior to the `SnykSecurityScan` task in your pipeline.

## How to use the Snyk task for Azure DevOps Pipelines

1. Install the [extension](https://marketplace.visualstudio.com/items?itemName=Snyk.snyk-security-scan) into your Azure DevOps environment.
2. Configure a service connection endpoint with your Snyk token. This is done at the project level. In Azure DevOps, go to Project settings -> Service connections -> New service connection -> Snyk Authentication. Give your service connection and enter a valid Snyk Token.
3. Within an Azure DevOps Pipeline, add the Snyk Security Scan task and configure it according to your needs according to details and examples below.

## Task Parameters

| Parameter                 | Description                                                                                                                                                                                                                                                                                                                                                                                                                | Required                     | Default       | Type                                                                              |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- | ------------- | --------------------------------------------------------------------------------- |
| serviceConnectionEndpoint | The Azure DevOps service connection endpoint where your Snyk API token is defined. Define this within your Azure DevOps project settings / S                                                                                                                                                                                                                                                                               | no                           | none          | String / Azure Service Connection Endpoint of type SnykAuth / Snyk Authentication |
| testType                  | Used by the task UI only                                                                                                                                                                                                                                                                                                                                                                                                   | no                           | "application" | string: "app" or "container"                                                      |
| dockerImageName           | The name of the container image to test.                                                                                                                                                                                                                                                                                                                                                                                   | yes, if container image test | none          | string                                                                            |
| dockerfilePath            | The path to the Dockerfile corresponding to the `dockerImageName`                                                                                                                                                                                                                                                                                                                                                          | yes, if container image test | none          | string                                                                            |
| targetFile                | Applicable to application type tests ony. The path to the manifest file to be used by Snyk. Should only be provided if non-standard.                                                                                                                                                                                                                                                                                       | no                           | none          | string                                                                            |
| severityThreshold         | The severity-threshold to use when testing and reporting. By default, issues of all severity types will be found.                                                                                                                                                                                                                                                                                                          | no                           | "low"         | string: "low" or "medium" or "high" or "critical"                                 |
| failOnThreshold           | The `severityThreshold` parameter is used to control the interaction with the Snyk CLI and reporting vulnerabilities. The `failOnThreshold` gives you additional control over build failure behaviour. For example, with `failOnIssues` set to `true` and `failOnThreshold` to `critical`, all issues would be reported on but _only_ critical issues would cause a build failure. See Usage Examples for more information | no                           | "low"         | string: "low" or "medium" or "high" or "critical"                                 |
| monitorWhen               | When to run `snyk monitor`. Valid options are `always` (default), `noIssuesFound`, and `never`. If set, this option overrides the value of `monitorOnBuild`.                                                                                                                                                                                                                                                               | no                           | "always"      | boolean                                                                           |
| failOnIssues              | This specifies if builds should be failed or continued based on issues found by Snyk. Combine with `failOnThreshold` to control which severity of issues causes the build to fail                                                                                                                                                                                                                                          | yes                          | true          | boolean                                                                           |
| projectName               | A custom name for the Snyk project to be created on snyk.io                                                                                                                                                                                                                                                                                                                                                                | no                           | none          | string                                                                            |
| organization              | Name of the Snyk organisation name, under which this project should be tested and monitored                                                                                                                                                                                                                                                                                                                                | no                           | none          | string                                                                            |
| testDirectory             | Alternate working directory. For example, if you want to test a manifest file in a directory other than the root of your repo, you would put in relative path to that directory.                                                                                                                                                                                                                                           | no                           | none          | string                                                                            |
| ignoreUnknownCA           | Use to ignore unknown or self-signed certificates. This might be useful in for self-hosted build agents with unusual network configurations or for Snyk on-prem installs configured with a self-signed certificate.                                                                                                                                                                                                        | no                           | false         | boolean                                                                           |
| additionalArguments       | Additional Snyk CLI arguments to be passed in. Refer to the Snyk CLI help page for information on additional arguments.                                                                                                                                                                                                                                                                                                    | no                           | none          | string                                                                            |

## Usage Examples

### Simple Application Testing Example

```
- task: SnykSecurityScan@1
  inputs:
    serviceConnectionEndpoint: 'mySnykToken'
    testType: 'app'
    failOnIssues: true
    monitorWhen: 'always'
```

### If you do not want the Snyk task fail your pipeline when issues are found, but still want to monitor the results in the Snyk UI

To do this, you need to:

- set `failOnIssues` to `false`, which will make sure the Snyk task will not fail your pipeline even if issues (vulnerabilities, etc) are found
- have `monitorWhen` set to `always` (or just leave `monitorWhen` out, since `always` is the default)

Here's a full example:

```
- task: SnykSecurityScan@1
  inputs:
    serviceConnectionEndpoint: 'mySnykToken'
    testType: 'app'
    failOnIssues: false
    monitorWhen: 'always'
```

An example that specifies a value for `severityThreshold` as medium and configures `failOnThreshold` to critical. This configuration would _only fail_ the build when critical issues are found, but all issues detected at medium, high and critical would be reported back to your snyk project for analysis

```
- task: SnykSecurityScan@1
  inputs:
    serviceConnectionEndpoint: 'mySnykToken'
    testType: 'app'
    severityThreshold: 'medium'
    failOnIssues: true
    failOnThreshold: 'critical'
    monitorWhen: 'always'
```

### Simple Container Image Testing Example

```
- task: SnykSecurityScan@1
  inputs:
    serviceConnectionEndpoint: 'mySnykToken'
    testType: 'container'
    dockerImageName: 'my-container-image-name'
    dockerfilePath: 'Dockerfile'
    failOnIssues: true
    monitorWhen: 'always'
```

---

Made with 💜 by Snyk
