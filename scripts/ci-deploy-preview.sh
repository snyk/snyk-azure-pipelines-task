#!/bin/bash

#
# Copyright 2025 Snyk Ltd.
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

# This script publish the extension to Marketplace. Preview Production deployment.
# Arguments:
# $1 - Extension version

set -e

# Install tfx
echo "Installing tfx-cli globally..."
sudo npm install -g tfx-cli@0.7.11

# Build project
"${PWD}/scripts/ci-build.sh" "prod"

# Handle arguments
AZ_EXT_NEW_VERSION="$1"

# Updating version in task.json file
node "${PWD}/scripts/ci-update-task-json-preview.js" ${AZ_EXT_NEW_VERSION}

# Override version
OVERRIDE_JSON="{ \"id\": \"${AZ_EXTENSION_ID}\", \"name\": \"${AZ_EXTENSION_NAME}\", \"version\": \"${AZ_EXT_NEW_VERSION}\", \"public\": true }"

# Echo ENVs and publish extension
echo "Publishing preview extension to Azure DevOps Marketplace..."
echo "Version: ${AZ_EXT_NEW_VERSION}"
echo "Extension ID: ${AZ_EXTENSION_ID}"
echo "Publisher: ${AZ_PUBLISHER}"
echo "Override JSON: ${OVERRIDE_JSON}"

tfx extension publish --manifest-globs vss-extension-preview.json \
--version $AZ_EXT_NEW_VERSION \
--extension-id $AZ_EXTENSION_ID \
--publisher $AZ_PUBLISHER \
--override $OVERRIDE_JSON \
--token $AZURE_DEVOPS_EXT_PAT

publish_exit_code=$?
if [[ publish_exit_code -eq 0 ]]; then
  echo "Preview Extension published: ${AZ_EXT_NEW_VERSION}"
else
  echo "Preview Extension failed to pubish with exit code ${publish_exit_code}"
  exit ${publish_exit_code}
fi
