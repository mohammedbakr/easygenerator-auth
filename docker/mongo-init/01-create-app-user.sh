#!/bin/bash
# Runs once, only when the data volume is empty (official mongo image behaviour).
# Creates the user the API connects with: readWrite on the app database only, never root.
set -euo pipefail

mongosh --quiet --eval '
  const appDb = db.getSiblingDB("easygenerator-auth");
  appDb.createUser({
    user: process.env.MONGO_APP_USERNAME,
    pwd: process.env.MONGO_APP_PASSWORD,
    roles: [{ role: "readWrite", db: "easygenerator-auth" }],
  });
'
