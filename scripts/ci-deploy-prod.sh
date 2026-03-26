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

# This script publish the extension to Marketplace. Production deployment.
# Arguments:
# $1 - Extension version

# Handle arguments
AZ_EXT_NEW_VERSION="$1"

# Updating version in task.json file
node "${PWD}/scripts/ci-update-task-json-prod.js" ${AZ_EXT_NEW_VERSION}

# Override version
OVERRIDE_JSON="{ \"id\": \"${AZ_EXTENSION_ID}\", \"name\": \"${AZ_EXTENSION_NAME}\", \"version\": \"${AZ_EXT_NEW_VERSION}\", \"public\": true }"

# Publish extension (--no-wait-validation: don't block on Marketplace validation)
echo "Publishing extension..."
echo "To manually check validation status, run:"
echo "  tfx extension isvalid --publisher ${AZ_PUBLISHER} --extension-id ${AZ_EXTENSION_ID} --version ${AZ_EXT_NEW_VERSION} --service-url https://marketplace.visualstudio.com/ --token <PAT>"
tfx extension publish --manifest-globs vss-extension.json \
--version $AZ_EXT_NEW_VERSION \
--extension-id $AZ_EXTENSION_ID \
--publisher $AZ_PUBLISHER \
--override $OVERRIDE_JSON \
--token $AZURE_DEVOPS_EXT_PAT \
--no-wait-validation

publish_exit_code=$?
if [[ publish_exit_code -eq 0 ]]; then
  echo "Extension published"
else
  echo "Extension failed to pubish with exit code ${publish_exit_code}"
  exit ${publish_exit_code}
fi
