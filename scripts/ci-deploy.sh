#!/bin/bash

# This script deploy the Snyk Azure Extension via CI tool when there is a merge
# to the master branch.
# The version is generated automatic via semversione tool and the master branch
# will be tag with the version.
# $1 - Extension version
# $2 (Optional) - Organization that will be shared the extension

set -e

echo "Deploying extension..."
# Handle arguments
pattern="[0-9]+\.[0-9]+\.[0-9]+"
AZ_EXT_NEW_VERSION="$1"
if [[ ! "${AZ_EXT_NEW_VERSION}" =~ $pattern ]]; then
  echo "Version is required."
  exit 1
fi
echo "Version: ${AZ_EXT_NEW_VERSION}"

if [[ ! -z "$2" ]]; then
  AZ_ORG="$2"
  echo "Org: ${AZ_ORG}"
fi
PWD=$(pwd)
echo "PWD: ${PWD}"

set +e
# check if tfx is installed and if not, install it
tfx version >/dev/null 2>&1
if [[ ! $? -eq 0 ]]; then
  echo "Check thinks tfx-cli is not installed"
  # echo "Installing tfx-cli globally..."
  # sudo npm install -g tfx-cli@0.7.11
else
  echo "Check thinks tfx-cli already installed"
fi
set -e

# install regardless of check until check working
echo "Installing tfx-cli globally..."
sudo npm install -g tfx-cli@0.7.11

# Build project
"${PWD}/scripts/ci-build.sh" "prod"

# Deploy project
if [[ ! -z "${AZ_ORG}" ]]; then
  "${PWD}/scripts/ci-deploy-dev.sh" ${AZ_EXT_NEW_VERSION} ${AZ_ORG}
else
  "${PWD}/scripts/ci-deploy-prod.sh" ${AZ_EXT_NEW_VERSION}
fi
echo "Extesion deployed!"
