# snyk-azure-pipelines-task

This task / extension for Azure Pipelines allows you to easily run Snyk scans within your Azure Pipeline jobs. You will need to first [create a Snyk account](https://snyk.io/login). There are multiple scan options:

- Snyk scan for vulnerable dependencies leveraging your project's manifest files, for example `pom.xml`, `package.json`, etc.
- Snyk scan for container images. This will look at Docker images.
- Snyk scan for Infrastructure as Code (IaC) files such as Terraform, CloudFormation, Kubernetes, and more.

In addition to running a Snyk security scan, you also have the option to monitor your application / container, in which case the dependency tree or container image metadata will be posted to your Snyk account for ongoing monitoring.

## Requirements

This extension requires that Node.js and npm be installed on the build agent. These are available by default on all Microsoft-hosted build agents. However, if you are using a self-hosted build agent, you may need to explicitly activate Node.js and npm and ensure they are in your [PATH](<https://en.wikipedia.org/wiki/PATH_(variable)>). This can be done using the [NodeTool task from Microsoft](https://docs.microsoft.com/en-us/azure/devops/pipelines/tasks/tool/node-js?view=azure-devops) prior to the `SnykSecurityScan` task in your pipeline.

## How to use the Snyk task for Azure DevOps Pipelines

1. Install the [extension](https://marketplace.visualstudio.com/items?itemName=Snyk.snyk-security-scan) into your Azure DevOps environment.
2. Configure a service connection endpoint with your Snyk token. This is done at the project level. In Azure DevOps, go to Project settings -> Service connections -> New service connection -> Snyk Authentication. Give your service connection and enter a valid Snyk Token.
3. Within an Azure DevOps Pipeline, add the Snyk Security Scan task and configure it according to your needs according to details and examples below.

## Task Parameters

| Parameter                 | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Required                     | Default  | Type                                                                              |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- | -------- | --------------------------------------------------------------------------------- |
| serviceConnectionEndpoint | The Azure DevOps service connection endpoint where your Snyk API token is defined. Define this within your Azure DevOps project settings / S                                                                                                                                                                                                                                                                                                                                                        | no                           | none     | String / Azure Service Connection Endpoint of type SnykAuth / Snyk Authentication |
| testType                  | Used by the task UI only. Valid options are `app` or `code` or `container` or `iac` or `command` to manually specify a Snyk CLI command.                                                                                                                                                                                                                                                                                                                                                            | no                           | "app"    | string: "app" or "code" or "container" or "iac"                                   |
| dockerImageName           | The name of the container image to test.                                                                                                                                                                                                                                                                                                                                                                                                                                                            | yes, if container image test | none     | string                                                                            |
| dockerfilePath            | The path to the Dockerfile corresponding to the `dockerImageName`                                                                                                                                                                                                                                                                                                                                                                                                                                   | yes, if container image test | none     | string                                                                            |
| targetFile                | Applicable to `app` and `iac` type tests. The path to the manifest file or IaC configuration file to be used by Snyk. Should only be provided if non-standard.                                                                                                                                                                                                                                                                                                                                      | no                           | none     | string                                                                            |
| severityThreshold         | The severity-threshold to use when testing and reporting. Applicable for `app`, `container`, and `iac` test types. By default, issues of all severity types will be found.                                                                                                                                                                                                                                                                                                                          | no                           | "low"    | string: "low" or "medium" or "high" or "critical"                                 |
| codeSeverityThreshold     | The Snyk Code severity-threshold to use when testing and reporting. By default, issues of all severity types will be found.                                                                                                                                                                                                                                                                                                                                                                         | no                           | "low"    | string: "low" or "medium" or "high"                                               |
| failOnThreshold           | The `severityThreshold` parameter is used to control the interaction with the Snyk CLI and reporting vulnerabilities. The `failOnThreshold` gives you additional control over build failure behaviour. For example, with `failOnIssues` set to `true` and `failOnThreshold` to `critical`, all issues would be reported on but _only_ critical issues would cause a build failure. `critical` is only applicable for `app`, `container`, or `iac` testType. See Usage Examples for more information | no                           | "low"    | string: "low" or "medium" or "high" or "critical"                                 |
| monitorWhen               | When to run `snyk monitor` applicable if `testType` is set as `app`, `container`, or `iac`. Valid options are `always` (default), `noIssuesFound`, and `never`. If set, this option overrides the value of `monitorOnBuild`.                                                                                                                                                                                                                                                                        | no                           | "always" | boolean                                                                           |
| failOnIssues              | This specifies if builds should be failed or continued based on issues found by Snyk. Combine with `failOnThreshold` to control which severity of issues causes the build to fail                                                                                                                                                                                                                                                                                                                   | yes                          | true     | boolean                                                                           |
| projectName               | A custom name for the Snyk project to be created on snyk.io                                                                                                                                                                                                                                                                                                                                                                                                                                         | no                           | none     | string                                                                            |
| organization              | Name of the Snyk organisation name, under which this project should be tested and monitored                                                                                                                                                                                                                                                                                                                                                                                                         | no                           | none     | string                                                                            |
| testDirectory             | Alternate working directory. For example, if you want to test a manifest file in a directory other than the root of your repo, you would put in relative path to that directory.                                                                                                                                                                                                                                                                                                                    | no                           | none     | string                                                                            |
| ignoreUnknownCA           | Use to ignore unknown or self-signed certificates. This might be useful in for self-hosted build agents with unusual network configurations or for Snyk on-prem installs configured with a self-signed certificate.                                                                                                                                                                                                                                                                                 | no                           | false    | boolean                                                                           |
| additionalArguments       | Additional Snyk CLI arguments to be passed in. Refer to the Snyk CLI help page for information on additional arguments. In the format `--<FLAG_1>=<VALUE_1> --<FLAG_2>=<VALUE_2> ...`                                                                                                                                                                                                                                                                                                               | no                           | none     | string                                                                            |
| distributionChannel       | Declare version for Snyk binaries. 'Stable' is for the current stable releases, whilst 'Preview' is for access to the latest features. You can also declare a specific version such as '1.1287.0'                                                                                                                                                                                                                                                                                                   | no                           | Stable   | string                                                                            |
| command                   | Define the Snyk command to execute. Current permitted commands are: `sbom`, `sbom test`, `iac`, `iac test`. Flag options can be added via `additionalArguments`.                                                                                                                                                                                                                                                                                                                                    | no                           | none     | string                                                                            |

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

An example that specifies a value for `severityThreshold` as medium and configures `failOnThreshold` to critical. This configuration would _only fail_ the build when critical issues are found, but all issues detected at medium, high and critical would be reported back to your snyk project for analysis.

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

### Snyk Code Testing Example

Snyk Code applicable Severity Threshold: high, medium or low (default). This is specified with `codeSeverityThreshold`. `failOnIssues` as defaulted to true will subsequently fail the build if issues are found with severity corresponding or higher than `failOnThreshold` severity. If `failOnIssues` is set to false, the build will continue.

```
- task: SnykSecurityScan@1
  inputs:
    serviceConnectionEndpoint: 'mySnykToken'
    testType: 'code'
    codeSeverityThreshold: 'medium'
    failOnThreshold: 'high'
    failOnIssues: true
```

### Snyk Infrastructure as Code Testing Example

Snyk IaC scans Infrastructure as Code files (Terraform, CloudFormation, Kubernetes, ARM templates, etc.) for security misconfigurations.

```
- task: SnykSecurityScan@1
  inputs:
    serviceConnectionEndpoint: 'mySnykToken'
    testType: 'iac'
    severityThreshold: 'medium'
    failOnIssues: true
    monitorWhen: 'always'
```

To scan a specific IaC file:

```
- task: SnykSecurityScan@1
  inputs:
    serviceConnectionEndpoint: 'mySnykToken'
    testType: 'iac'
    targetFile: 'terraform/main.tf'
    severityThreshold: 'high'
    failOnIssues: true
```

### Snyk SBOM Example

Snyk SBOM requires `--format=<SBOM_FORMAT>`. This is specified with `addtionalArguments`.

```
# create an SBOM and output to a JSON file
- task: SnykSecurityScan@1
  inputs:
    serviceConnectionEndpoint: 'mySnykToken'
    testType: 'command'
    command: 'sbom'
    additionalArguments; '--format=cyclonedx1.6+json --json-file-output=$(Agent.TempDirectory)/report.sbom.json'
    failOnIssues: true

# test an SBOM JSON file
- task: SnykSecurityScan@1
  inputs:
    serviceConnectionEndpoint: 'mySnykToken'
    testType: 'command'
    command: 'sbom test'
    additionalArguments; '--file=$(Agent.TempDirectory)/report.sbom.json'
    failOnIssues: true
```

## Contributing

To ensure the long-term stability and quality of this project, we are moving to a closed-contribution model effective August 2025. This change allows our core team to focus on a centralized development roadmap and rigorous quality assurance, which is essential for a component with such extensive usage.

All of our development will remain public for transparency. We thank the community for its support and valuable contributions.

## Getting Support

GitHub issues have been disabled on this repository as part of our move to a closed-contribution model. The Snyk support team does not actively monitor GitHub issues on any Snyk development project.

For help with Snyk products, please use the [Snyk support page](https://support.snyk.io/), which is the fastest way to get assistance.
