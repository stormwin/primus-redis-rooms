#!/bin/bash

# Release script for primus-redis-rooms
# Usage: ./scripts/release.sh [patch|minor|major] ["commit message"]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if version type is provided
if [ -z "$1" ]; then
    echo -e "${RED}Error: Version type is required${NC}"
    echo "Usage: ./scripts/release.sh [patch|minor|major] [\"commit message\"]"
    exit 1
fi

VERSION_TYPE=$1
COMMIT_MESSAGE=$2

# Validate version type
if [[ "$VERSION_TYPE" != "patch" && "$VERSION_TYPE" != "minor" && "$VERSION_TYPE" != "major" ]]; then
    echo -e "${RED}Error: Invalid version type '$VERSION_TYPE'${NC}"
    echo "Usage: ./scripts/release.sh [patch|minor|major] [\"commit message\"]"
    exit 1
fi

# Get current version from package.json
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo -e "${YELLOW}Current version: $CURRENT_VERSION${NC}"

# Parse version components
IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT_VERSION"

# Calculate new version
case $VERSION_TYPE in
    patch)
        NEW_PATCH=$((PATCH + 1))
        NEW_VERSION="$MAJOR.$MINOR.$NEW_PATCH"
        ;;
    minor)
        NEW_MINOR=$((MINOR + 1))
        NEW_VERSION="$MAJOR.$NEW_MINOR.0"
        ;;
    major)
        NEW_MAJOR=$((MAJOR + 1))
        NEW_VERSION="$NEW_MAJOR.0.0"
        ;;
esac

echo -e "${GREEN}New version: $NEW_VERSION${NC}"

# Get commit message if not provided
if [ -z "$COMMIT_MESSAGE" ]; then
    echo ""
    read -p "Enter release description (or press Enter for default): " COMMIT_MESSAGE
fi

# Use default message if empty
if [ -z "$COMMIT_MESSAGE" ]; then
    COMMIT_MESSAGE="Release $NEW_VERSION"
fi

echo -e "${YELLOW}Release message: $COMMIT_MESSAGE${NC}"

# Check for uncommitted changes
if [[ -n $(git status --porcelain) ]]; then
    echo -e "${YELLOW}Warning: You have uncommitted changes.${NC}"
    read -p "Do you want to continue? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Release cancelled."
        exit 1
    fi
fi

# Confirm the release
echo ""
echo "This will:"
echo "  1. Update package.json version to $NEW_VERSION"
echo "  2. Commit with message: 'chore(release): v$NEW_VERSION - $COMMIT_MESSAGE'"
echo "  3. Create branch 'v$NEW_VERSION'"
echo "  4. Create tag 'v$NEW_VERSION' with message: '$COMMIT_MESSAGE'"
echo "  5. Push branch and tag to origin"
echo ""
read -p "Proceed with release? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Release cancelled."
    exit 1
fi

# Update package.json version
echo -e "${YELLOW}Updating package.json...${NC}"
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
pkg.version = '$NEW_VERSION';
fs.writeFileSync('./package.json', JSON.stringify(pkg, null, '\t') + '\n');
"

# Create and checkout new branch
BRANCH_NAME="v$NEW_VERSION"
echo -e "${YELLOW}Creating branch '$BRANCH_NAME'...${NC}"
git checkout -b "$BRANCH_NAME"

# Commit the version change
echo -e "${YELLOW}Committing version change...${NC}"
git add package.json
git commit -m "chore(release): v$NEW_VERSION - $COMMIT_MESSAGE"

# Create tag
TAG_NAME="v$NEW_VERSION"
echo -e "${YELLOW}Creating tag '$TAG_NAME'...${NC}"
git tag -a "$TAG_NAME" -m "$COMMIT_MESSAGE"

# Push branch and tag
echo -e "${YELLOW}Pushing branch and tag to origin...${NC}"
git push -u origin "$BRANCH_NAME"
git push origin "$TAG_NAME"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Release $NEW_VERSION completed successfully!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Summary:"
echo "  - Version: $NEW_VERSION"
echo "  - Branch: $BRANCH_NAME"
echo "  - Tag: $TAG_NAME"
echo "  - Message: $COMMIT_MESSAGE"
echo ""
echo "To use this version in another project:"
echo "  yarn add git+ssh://git@github.com:stormwin/primus-redis-rooms.git#$TAG_NAME"
echo "  # or"
echo "  npm install git+ssh://git@github.com:stormwin/primus-redis-rooms.git#$TAG_NAME"
