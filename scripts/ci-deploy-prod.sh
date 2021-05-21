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

# Publish extension
echo "Publishing extension..."
tfx extension create \
--manifest-globs vss-extension.json \
--version $AZ_EXT_NEW_VERSION \
--extension-id $AZ_EXTENSION_ID \
--publisher $AZ_PUBLISHER \
--override $OVERRIDE_JSON \
--token $AZURE_DEVOPS_EXT_PAT \
--output-path Snyk-snyk-security-scan.vsix

publish_exit_code=$?
if [[ publish_exit_code -eq 0 ]]; then
  echo "Extension published"
else
  echo "Extension failed to pubish with exit code ${publish_exit_code}"
  exit ${publish_exit_code}
fi
