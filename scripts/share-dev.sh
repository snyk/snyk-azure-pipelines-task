#!/bin/bash

# This script share the extension with a specific org for development propose.
# Arguments:
# $1 - Extension version
# $2 - Organization that will be shared the extension

# Handle arguments
AZ_EXT_NEW_VERSION="$1"
AZ_ORG="$2"

# Check if the Azure CLI is already installed. If not, install it.
az -v >/dev/null 2>&1
if [[ ! $? -eq 0 ]]; then
  echo "Intalling AZ Cli..."
  platform=$OSTYPE
  echo "Platform: ${platform}"
  if [[ $platform == "linux-gnu" ]]; then
    curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
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

echo "About to deploy to dev environment using:"
echo "AZ_EXT_NEW_VERSION: ${AZ_EXT_NEW_VERSION}"
echo "AZ_PUBLISHER: ${AZ_PUBLISHER}"
echo "AZ_EXTENSION_ID: ${AZ_EXTENSION_ID}"
echo "AZ_TASK_NAME: ${AZ_TASK_NAME}"
echo "AZ_TASK_FRIENDLY_NAME: ${AZ_TASK_FRIENDLY_NAME}"
echo "AZ_ORG: ${AZ_ORG}"
echo "AZ_DEV_TASK_ID: ${AZ_DEV_TASK_ID}"

# Updating version in task.json file
node "${PWD}/scripts/update-task-json-dev.js" ${AZ_EXT_NEW_VERSION}

# Override version
OVERRIDE_JSON="{ \"name\": \"${AZ_EXTENSION_NAME}\", \"version\": \"${AZ_EXT_NEW_VERSION}\" }"

# Sharing extension
echo "Publishing and sharing extension..."
echo "OVERRIDE_JSON: ${OVERRIDE_JSON}"

tfx extension publish --manifest-globs vss-extension-dev.json \
--version $AZ_EXT_NEW_VERSION \
--share-with $AZ_ORG \
--extension-id $AZ_EXTENSION_ID \
--publisher $AZ_PUBLISHER \
--override $OVERRIDE_JSON \
--token $AZURE_DEVOPS_EXT_PAT

publish_exit_code=$?
if [[ publish_exit_code -eq 0 ]]; then
  echo "Extension published and shared with Azure org"
else
  echo "Extension failed to pubish with exit code ${publish_exit_code}"
  exit ${publish_exit_code}
fi

# echo "See if the extension is installed..."
az devops extension show \
  --publisher-name $AZ_PUBLISHER \
  --extension-name $AZ_EXTENSION_ID \
  --organization "https://dev.azure.com/${AZ_ORG}/"

if [[ $? -eq 0 ]]; then
  echo "Extension already installed in org ${AZ_ORG}"
else
  echo "Extension not already installed."
  echo "Installing extension..."
  az devops extension install \
    --publisher-name $AZ_PUBLISHER \
    --extension-name $AZ_EXTENSION_ID \
    --organization "https://dev.azure.com/${AZ_ORG}/"
fi

# Updating version in task.json file
node "${PWD}/scripts/recovery-task-json-dev.js"

echo "Extension installed"

echo "reinstalling all dependencies..."
npm install
