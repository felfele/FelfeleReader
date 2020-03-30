Feeds [![Build Status](https://travis-ci.org/felfele/feeds.svg?branch=master)](https://travis-ci.org/felfele/feeds)
=======

## Installation and setup

This project uses React Native. You will need Android SDK, Xcode, Node.js and NPM to be installed.

## Install dependencies

`npm install`

## Link assets

`npm run link-assets`

## Build and test in simulator

`npm run ios`

## Start packager in terminal

`npm start -- --reset-cache`

## Generate the icon

`app-icon generate`

Make sure the generated images does not contain transparency for iOS.

```bash
$ mogrify -alpha off ios/felfele/Images.xcassets/AppIcon.appiconset/*.png
```

## Build android release version

`cd android`
`./gradlew assembleRelease`

## Sign the android release with debug key

### Generate a debug key
`$ keytool -genkey -v -keystore android/debug.keystore -storepass android -alias androiddebugkey -keypass android -keyalg RSA -keysize 2048 -validity 10000 -dname "C=US, O=Android, CN=Android Debug"`

### Sign the build with the debug key

`jarsigner -verbose -sigalg SHA1withRSA -digestalg SHA1 -keystore android/debug.keystore -storepass android -keypass android android/app/build/outputs/apk/release/app-release-unsigned.apk androiddebugkey`

## Running with the debugger

Set the environment variable `REACT_DEBUGGER`, e.g.:

`REACT_DEBUGGER="node node_modules/react-native-debugger-open/bin/rndebugger-open.js --open --port 8081"`

Then start the packager as normal.

## Running E2E tests

It is iOS only for now.

`npm run e2e:ios`

## Build configurations

There are four build configuration on iOS:
- Release: production version, this builds the Felfele app
- Debug: debug version
- BetaRelease: test app with different app group, this builds the FelfeleBeta app
- BetaDebug: debug version of test app with different app group

For example running the BetaDebug version locally:

`npm run ios -- --simulator "iPhone 11" --scheme FelfeleBeta --configuration BetaDebug`

## Build beta version

Increase build number:

`./scripts/increase_build_number.sh`

Make a beta archive

`./scripts/build_xcode_archive.sh FelfeleBeta archive`

Upload with XCode Organizer to the App Store
