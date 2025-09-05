#!/usr/bin/env bash
# exit on error
set -o errexit

# 1. Install Backend Dependencies
pip install -r requirements.txt

# 2. Build Frontend
cd easyplc-frontend
npm install
npm run build
cd .. # Go back to root