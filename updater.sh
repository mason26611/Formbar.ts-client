#!/bin/bash

echo "Tip: Run this with arguments to skip steps. For example, './updater.sh --no-fetch' to skip fetching from the remote repository."
echo "Available arguments: --no-fetch, --no-install, --no-build, --full, --full-dev, --sync-dir <path>"

# Parse arguments
NO_FETCH=false
NO_INSTALL=false
NO_BUILD=false
FULL=false
FULL_DEV=false
SYNC_DIR="/var/www/formbar"

while [[ $# -gt 0 ]]; do
    case $1 in
        --no-fetch)
            NO_FETCH=true
            shift
            ;;
        --no-install)
            NO_INSTALL=true
            shift
            ;;
        --no-build)
            NO_BUILD=true
            shift
            ;;
        --full)
            FULL=true
            shift
            ;;
        --full-dev)
            FULL_DEV=true
            shift
            ;;
        --sync-dir)
            SYNC_DIR="$2"
            shift 2
            ;;
        *)
            echo "Unknown argument: $1"
            echo "Usage: ./updater.sh [--no-fetch] [--no-install] [--no-build] [--full] [--full-dev] [--sync-dir <path>]"
            exit 1
            ;;
    esac
done

# Function must be defined before it's called
sync_to_formbar() {
    read -p "Do you want to sync the build to $SYNC_DIR? (y/n) " sync_option
    if [[ "$sync_option" == "y" ]]; then
        echo "Syncing build to $SYNC_DIR..."
        rsync -av dist/ "$SYNC_DIR/"
        echo "Sync complete."
    else
        echo "Skipping sync."
        exit 0
    fi
}

# Handle --full and --full-dev modes (runs everything automatically)
if [[ "$FULL" == true || "$FULL_DEV" == true ]]; then
    echo "Running full automated build..."
    
    echo "Fetching from remote repository and pulling latest changes..."
    git fetch && git pull
    
    echo "Installing dependencies..."
    npm i
    
    if [[ "$FULL" == true ]]; then
        echo "Building for production..."
        npm run build
    else
        echo "Building for development..."
        npx vite build
    fi
    
    echo "Syncing build to $SYNC_DIR..."
    rsync -av dist/ "$SYNC_DIR/"
    echo "Sync complete."
    exit 0
fi

# Fetch from remote repository
if [[ "$NO_FETCH" == false ]]; then
    echo "Fetching from remote repository and pulling latest changes..."
    git fetch && git pull
    read -p "Update complete. Press Enter to continue."
else
    echo "Skipping fetch (--no-fetch)."
fi

# Install dependencies
if [[ "$NO_INSTALL" == false ]]; then
    echo "Installing dependencies..."
    npm i
else
    echo "Skipping install (--no-install)."
fi

clear

# Build menu
if [[ "$NO_BUILD" == true ]]; then
    echo "Skipping build (--no-build)."
    exit 0
fi

echo "Build [1] (Default)"
echo "Build (Development) [2]"
echo "Test Locally [3]"
echo "Test Over LAN [4]"
echo "Quit [q]"
read -p "Select an option: " option

case $option in
    1)
        echo "Building for production..."
        npm run build
        sync_to_formbar
        ;;
    2)
        echo "Building for development..."
        npx vite build
        sync_to_formbar
        ;;
    3)
        echo "Testing locally..."
        npm run dev
        ;;
    4)
        echo "Testing over LAN..."
        npm run dev -- --host
        ;;
    q)
        echo "Exiting."
        exit 0
        ;;
    *)
        echo "Invalid option. Exiting."
        exit 1
        ;;
esac
