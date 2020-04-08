#!/bin/bash

# This script share the extension with a specific org for development propose.
# Arguments:
# $1 - Extension version
# $2 - Organization that will be shared the extension

# Handle arguments
AZ_EXT_NEW_VERSION="$1"
AZ_ORG="$2"

# Check if AZ Cli is already installed. If not installed it.
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

# Unistall the extinsion if it has been already installed in this organization
echo "Uninstall extension..."
az devops extension uninstall \
  --publisher-name $AZ_PUBLISHER \
  --extension-name $AZ_EXTENSION_ID \
  --organization "https://dev.azure.com/${AZ_ORG}/" --yes
echo "Extension uninstalled"

# Updating version in task.json file
node "${PWD}/scripts/update-task-json-dev.js" ${AZ_EXT_NEW_VERSION}

# Override version
OVERRIDE_JSON="{ \"name\": \"${AZ_EXTENSION_NAME}\", \"version\": \"${AZ_EXT_NEW_VERSION}\" }"

# Sharing extension
echo "Sharing extension..."
echo "OVERRIDE_JSON: ${OVERRIDE_JSON}"
tfx extension publish --manifest-globs vss-extension-dev.json \
--version $AZ_EXT_NEW_VERSION \
--share-with $AZ_ORG \
--extension-id $AZ_EXTENSION_ID \
--publisher $AZ_PUBLISHER \
--override $OVERRIDE_JSON \
--token $AZURE_DEVOPS_EXT_PAT
echo "Extension shared"

# Install extension in the organization after it was shared with the same organization
echo "Installing extension..."
az devops extension install \
  --publisher-name $AZ_PUBLISHER \
  --extension-name $AZ_EXTENSION_ID \
  --organization "https://dev.azure.com/${AZ_ORG}/"


# Updating version in task.json file
node "${PWD}/scripts/recovery-task-json-dev.js"

echo "Extension installed"

echo "reinstalling all dependencies..."
npm install
