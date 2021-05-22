#!/bin/bash

# This script publish the extension to Marketplace. Production deployment.
# Arguments:
# $1 - Extension version

# Handle arguments
AZ_EXT_NEW_VERSION="$1"

# Updating version in task.json file
node "${PWD}/scripts/ci-update-task-json-prod.js" ${AZ_EXT_NEW_VERSION}

# Override version
OVERRIDE_JSON="{ \"id\": \"${AZ_EXTENSION_ID}\", \"name\": \"${AZ_EXTENSION_NAME}\", \"version\": \"${AZ_EXT_NEW_VERSION}\", \"public\": true }"

echo "Creating extension..."
tfx extension create \
--manifest-globs vss-extension.json \
--version $AZ_EXT_NEW_VERSION \
--extension-id $AZ_EXTENSION_ID \
--publisher $AZ_PUBLISHER \
--override $OVERRIDE_JSON \
--token $AZURE_DEVOPS_EXT_PAT \
--output-path Snyk-snyk-security-scan.vsix

create_exit_code=$?
if [[ create_exit_code -eq 0 ]]; then
  echo "Extension created"
  ls -la
else
  echo "Failed to create extension with exit code ${create_exit_code}"
  exit ${create_exit_code}
fi

if [[ ! -f "Snyk-snyk-security-scan.vsix" ]]; then
  echo "missing Snyk-snyk-security-scan.vsix file, not publishing extension"
  exit 1
fi

echo "Snyk-snyk-security-scan.vsix file exists, publishing extension..."
tfx extension publish --token $AZURE_DEVOPS_EXT_PAT --vsix Snyk-snyk-security-scan.vsix

publish_exit_code=$?
if [[ publish_exit_code -eq 0 ]]; then
  echo "Extension published"
else
  echo "Failed to publish extension with exit code ${publish_exit_code}"
  exit ${publish_exit_code}
fi
