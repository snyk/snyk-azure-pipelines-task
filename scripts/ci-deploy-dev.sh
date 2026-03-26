#!/bin/bash

#
# Copyright 2022 Snyk Ltd.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#

# This script deploys a dev version of the extension to the dev environment for development / testing purposes.
# It also shares / installs it into the given Azure organization.
# Arguments:
# $1 - Extension version
# $2 - Organization that will be shared the extension

# Handle arguments
INPUT_PARAM_AZ_EXT_NEW_VERSION="$1"
INPUT_PARAM_AZ_ORG="$2"

# Check if the Azure CLI is already installed. If not, install it.
az -v >/dev/null 2>&1
if [[ ! $? -eq 0 ]]; then
  echo "Installing AZ Cli..."
  platform=$OSTYPE
  echo "Platform: ${platform}"
  if [[ $platform == "linux-gnu" ]]; then
    curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
    az extension add --name azure-devops
  elif [[ $platform == "darwin"* ]]; then
    brew -v >/dev/null 2>&1
    if [[ $? -eq 0 ]]; then
      brew update && brew install azure-cli
    else
      echo "You need to have brew or install AZ Cli manually"
      exit 1
    fi
  else
    echo "Platform ${platform} not supported"
    exit 1
  fi
fi

# echo "See if the extension is installed..."
az devops extension show \
  --publisher-name $DEV_AZ_PUBLISHER \
  --extension-name $DEV_AZ_EXTENSION_ID \
  --organization "https://dev.azure.com/${INPUT_PARAM_AZ_ORG}/"

if [[ $? -eq 0 ]]; then
  echo "Extension is installed in org ${INPUT_PARAM_AZ_ORG}... uninstall it"
  # Unistall the extinsion if it has been already installed in this organization.
  # This may not be required it works much more consistently with it.
  echo "Uninstall extension..."
  az devops extension uninstall \
    --publisher-name $DEV_AZ_PUBLISHER \
    --extension-name $DEV_AZ_EXTENSION_ID \
    --organization "https://dev.azure.com/${INPUT_PARAM_AZ_ORG}/" --yes
  echo "Extension uninstalled"
else
  echo "Extension not already installed."
fi

echo "About to deploy to dev environment using:"
echo "INPUT_PARAM_AZ_EXT_NEW_VERSION: ${INPUT_PARAM_AZ_EXT_NEW_VERSION}"
echo "DEV_AZ_PUBLISHER: ${DEV_AZ_PUBLISHER}"
echo "DEV_AZ_EXTENSION_ID: ${DEV_AZ_EXTENSION_ID}"
echo "DEV_AZ_TASK_NAME: ${DEV_AZ_TASK_NAME}"
echo "DEV_AZ_TASK_FRIENDLY_NAME: ${DEV_AZ_TASK_FRIENDLY_NAME}"
echo "INPUT_PARAM_AZ_ORG: ${INPUT_PARAM_AZ_ORG}"
echo "DEV_AZ_TASK_ID: ${DEV_AZ_TASK_ID}"

# Updating version in task.json file
node "${PWD}/scripts/update-task-json-dev.js" ${INPUT_PARAM_AZ_EXT_NEW_VERSION}

# Override version
OVERRIDE_JSON="{ \"name\": \"${DEV_AZ_EXTENSION_NAME}\", \"version\": \"${INPUT_PARAM_AZ_EXT_NEW_VERSION}\" }"

# See if the snykTask/dist and snykTask/node_modules folders are present
echo "Checking for snykTask/dist folder..."
ls -la snykTask/dist
echo "checking snykTask/node_modules..."
ls -la snykTask/node_modules

# Publishing and sharing extension
echo "Publishing and sharing extension..."
echo "OVERRIDE_JSON: ${OVERRIDE_JSON}"
echo "About to call \`tfx extension publish...\`"

tfx extension publish --manifest-globs vss-extension-dev.json \
--version $INPUT_PARAM_AZ_EXT_NEW_VERSION \
--share-with $INPUT_PARAM_AZ_ORG \
--extension-id $DEV_AZ_EXTENSION_ID \
--publisher $DEV_AZ_PUBLISHER \
--override $OVERRIDE_JSON \
--token $DEV_AZURE_DEVOPS_EXT_PAT

publish_exit_code=$?
if [[ publish_exit_code -eq 0 ]]; then
  echo "Extension published and shared with Azure org"
else
  echo "Extension failed to pubish with exit code ${publish_exit_code}"
  exit ${publish_exit_code}
fi

# re-install all dependencies. The dev deps were pruned off in ci-build.sh
echo "reinstalling all dependencies..."
npm install

echo "Run script to install the dev extension into the dev org in Azure DevOps..."
node ./ops/deploy/dist/install-extension-to-dev-org.js "${INPUT_PARAM_AZ_EXT_NEW_VERSION}"
if [[ ! $? -eq 0 ]]; then
  echo "failed installing dev extension at correct version"
  exit 1
fi

# Updating version in task.json file
node "${PWD}/scripts/recovery-task-json-dev.js"

echo "Extension installed"
