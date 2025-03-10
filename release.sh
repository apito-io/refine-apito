#!/bin/bash

# Check if version is provided
if [ -z "$1" ]; then
  echo "Error: Version number is required"
  echo "Usage: ./release.sh <version> [commit message]"
  echo "Example: ./release.sh 0.1.7"
  echo "Example with custom message: ./release.sh 0.1.7 \"feat: add new GraphQL error handling\""
  exit 1
fi

VERSION=$1
# Use custom commit message if provided, otherwise use default
COMMIT_MSG=${2:-"chore: bump version to $VERSION"}

# Validate version format (basic check)
if [[ ! $VERSION =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9.]+)?$ ]]; then
  echo "Error: Version must be in format x.y.z or x.y.z-tag"
  exit 1
fi

echo "Version: $VERSION"
echo "Commit message: $COMMIT_MSG"
echo ""

# Update version in package.json
npm version $VERSION --no-git-tag-version

# Commit the change
git add .
git commit -m "$COMMIT_MSG"

# Create and push the tag
git tag v$VERSION
git push && git push --tags

echo "Released version $VERSION successfully!"
echo "The GitHub workflow will now build and publish to npm." 