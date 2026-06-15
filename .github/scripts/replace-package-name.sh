#!/bin/bash
# Replace package name in Android project files
# Usage: ./replace-package-name.sh <new.package.name> <app_type: user|admin>

set -e

NEW_PACKAGE="$1"
APP_TYPE="$2"

if [ -z "$NEW_PACKAGE" ]; then
  echo "Error: Package name is required"
  exit 1
fi

# Determine working directory
if [ "$APP_TYPE" = "admin" ]; then
  ANDROID_DIR="south-admin/android"
  CAPACITOR_CONFIG="south-admin/capacitor.config.ts"
else
  ANDROID_DIR="android"
  CAPACITOR_CONFIG="capacitor.config.ts"
fi

OLD_PACKAGE_USER="com.qtbm.south"
OLD_PACKAGE_ADMIN="com.qtbm.south.admin"

if [ "$APP_TYPE" = "admin" ]; then
  OLD_PACKAGE="$OLD_PACKAGE_ADMIN"
else
  OLD_PACKAGE="$OLD_PACKAGE_USER"
fi

echo "Replacing package name: $OLD_PACKAGE → $NEW_PACKAGE (app: $APP_TYPE)"

# Convert package name to path
NEW_PATH=$(echo "$NEW_PACKAGE" | tr '.' '/')
OLD_PATH=$(echo "$OLD_PACKAGE" | tr '.' '/')

# 1. Update Capacitor config
if [ -f "$CAPACITOR_CONFIG" ]; then
  sed -i "s/$OLD_PACKAGE/$NEW_PACKAGE/g" "$CAPACITOR_CONFIG"
  echo "✅ Updated $CAPACITOR_CONFIG"
fi

# 2. Update AndroidManifest.xml
MANIFEST="$ANDROID_DIR/app/src/main/AndroidManifest.xml"
if [ -f "$MANIFEST" ]; then
  sed -i "s/$OLD_PACKAGE/$NEW_PACKAGE/g" "$MANIFEST"
  echo "✅ Updated AndroidManifest.xml"
fi

# 3. Update build.gradle
BUILD_GRADLE="$ANDROID_DIR/app/build.gradle"
if [ -f "$BUILD_GRADLE" ]; then
  sed -i "s/$OLD_PACKAGE/$NEW_PACKAGE/g" "$BUILD_GRADLE"
  echo "✅ Updated build.gradle"
fi

# 4. Update build.gradle.kts if exists
BUILD_GRADLE_KTS="$ANDROID_DIR/app/build.gradle.kts"
if [ -f "$BUILD_GRADLE_KTS" ]; then
  sed -i "s/$OLD_PACKAGE/$NEW_PACKAGE/g" "$BUILD_GRADLE_KTS"
  echo "✅ Updated build.gradle.kts"
fi

# 5. Move Java source files to new package path
OLD_JAVA_DIR="$ANDROID_DIR/app/src/main/java/$OLD_PATH"
NEW_JAVA_DIR="$ANDROID_DIR/app/src/main/java/$NEW_PATH"

if [ -d "$OLD_JAVA_DIR" ]; then
  mkdir -p "$NEW_JAVA_DIR"
  cp -r "$OLD_JAVA_DIR"/* "$NEW_JAVA_DIR/" 2>/dev/null || true
  
  # Update package declarations in Java files
  find "$NEW_JAVA_DIR" -name "*.java" -exec sed -i "s/package $OLD_PACKAGE/package $NEW_PACKAGE/g" {} \;
  find "$NEW_JAVA_DIR" -name "*.java" -exec sed -i "s/import $OLD_PACKAGE/import $NEW_PACKAGE/g" {} \;
  
  # Remove old directory
  rm -rf "$OLD_JAVA_DIR"
  echo "✅ Moved Java files: $OLD_JAVA_DIR → $NEW_JAVA_DIR"
fi

# 6. Update strings.xml
STRINGS_XML="$ANDROID_DIR/app/src/main/res/values/strings.xml"
if [ -f "$STRINGS_XML" ]; then
  # Update package name references if any
  sed -i "s/$OLD_PACKAGE/$NEW_PACKAGE/g" "$STRINGS_XML"
  echo "✅ Updated strings.xml"
fi

# 7. Update google-services.json package name
GS_JSON="$ANDROID_DIR/app/google-services.json"
if [ -f "$GS_JSON" ]; then
  # Note: google-services.json should already be replaced with client's file
  # But update package_name references just in case
  sed -i "s/$OLD_PACKAGE/$NEW_PACKAGE/g" "$GS_JSON" 2>/dev/null || true
  echo "✅ Updated google-services.json"
fi

# 8. Update proguard rules
PROGUARD="$ANDROID_DIR/app/proguard-rules.pro"
if [ -f "$PROGUARD" ]; then
  sed -i "s/$OLD_PACKAGE/$NEW_PACKAGE/g" "$PROGUARD" 2>/dev/null || true
  echo "✅ Updated proguard-rules.pro"
fi

# 9. Clean up empty parent directories
PARENT_DIR="$ANDROID_DIR/app/src/main/java"
CURRENT_PATH="$OLD_PATH"
while [ "$CURRENT_PATH" != "." ] && [ "$CURRENT_PATH" != "" ]; do
  DIR="$PARENT_DIR/$CURRENT_PATH"
  if [ -d "$DIR" ] && [ -z "$(ls -A "$DIR" 2>/dev/null)" ]; then
    rmdir "$DIR" 2>/dev/null || true
  fi
  CURRENT_PATH=$(dirname "$CURRENT_PATH")
done

echo ""
echo "🎉 Package name replacement complete!"
echo "   $OLD_PACKAGE → $NEW_PACKAGE"
