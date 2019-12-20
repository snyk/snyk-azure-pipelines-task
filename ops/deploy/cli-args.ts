const yargs = require("yargs");
const fs = require("fs");

enum Command {
  VersionCheck,
  Deploy
}

enum DeployTarget {
    Prod,
    Dev,
    Custom
}

interface InputArgs {
  command: Command,
  target: DeployTarget,
  configFile: string,
  newVersion: string
}

const parseInputParameters = (inputArgs): InputArgs => {
  const scriptName = "deploy";
  const usageMsg = "Usage: $0 <command>";
  const testCommandUsage = "test <chart-directory> [options]";
  const testCommandDescription = "Check images in your charts for vulnerabilities";
  const scriptExample = "$0 test . --output=snyk-out.json";

  const argv = yargs(inputArgs)
  .version()
  .scriptName(scriptName)
  .usage(usageMsg)
  .command("version-check", "Checks that all the versions match")
  .command('deploy [options]', 'Deploys to specified target', y => {
    y.option('target', {
      description: 'the deployment target',
      type: 'string',
      demandOption: true,
      choices: ['dev', 'prod', 'custom']
    })
    .option('config-file', {
      description: 'Config JSON file specifying custom deployment arguments',
      type: 'string'
    })
    .option('new-version', {
      description: 'New version to release; only valid with --target=custom',
      type: 'string'
    })
    .check(argsToCheck => {
      if (argsToCheck.target === 'custom' && !argsToCheck.configFile) {
        throw new Error("--config-file is required for target `custom`");
      }

      if (argsToCheck.target !== 'custom' && argsToCheck.configFile) {
        throw new Error("--config-file isonly allowed with target `custom`");
      }

      if (argsToCheck.target !== 'custom' && argsToCheck.newVersion) {
        throw new Error("--new-version is only allowed with target `custom`");
      }

      return true;

    });
  })
  .demandCommand(1)
  .help("help")
  .alias("help", "h")
  .example("$0 version-check")
  .example("$0 deploy --target=dev")
  .example("$0 deploy --target=prod")
  .example("$0 deploy --target=custom --config-file=custom-args.json")
  .argv;

  console.log("argv:", argv);

  return parseOptions(argv);
};

const parseOptions = (argv: any): InputArgs => {
  const options = {
    command: Command.VersionCheck,
    target: DeployTarget.Custom,
    configFile: "",
    newVersion: ""
  } as InputArgs;

  const command = argv._[0];
  if (command === "version-check") {
    options.command = Command.VersionCheck;
  } else if (command === "deploy") {
    options.command = Command.Deploy;

    if (argv.target) {
      if (argv.target === "dev") {
        options.target = DeployTarget.Dev;
      } else if (argv.target === "prod") {
        options.target = DeployTarget.Prod;
      } else if (argv.target === "custom") {
        options.target = DeployTarget.Custom;
        if (argv.configFile) {
          options.configFile = argv.configFile;
        }
        if (argv.newVersion) {
          options.newVersion = argv.newVersion;
        }
      } else {
        // this should never happen
        throw new Error(`Invalid command: ${command}`);
      }
    }
  } else {
    // this should never happen
    throw new Error(`Invalid deploy target: ${argv.target}`);
  }

  return options;
};

export { InputArgs, parseInputParameters, Command, DeployTarget };
