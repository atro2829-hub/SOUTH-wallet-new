#!/bin/bash
# Generate Android app icons from a logo URL
# Usage: ./generate-icons.sh <logo_url>

set -e

LOGO_URL="$1"

if [ -z "$LOGO_URL" ]; then
  echo "No logo URL provided, skipping icon generation"
  exit 0
fi

echo "Generating icons from: $LOGO_URL"

# Install ImageMagick if not present
if ! command -v convert &> /dev/null; then
  sudo apt-get update -qq && sudo apt-get install -y -qq imagemagick 2>/dev/null || true
fi

# Download the logo
TEMP_LOGO="/tmp/app_logo.png"
curl -sL "$LOGO_URL" -o "$TEMP_LOGO"

if [ ! -f "$TEMP_LOGO" ] || [ ! -s "$TEMP_LOGO" ]; then
  echo "⚠️ Failed to download logo, using default"
  exit 0
fi

# Android icon sizes
declare -A SIZES=(
  ["mipmap-mdpi"]="48"
  ["mipmap-hdpi"]="72"
  ["mipmap-xhdpi"]="96"
  ["mipmap-xxhdpi"]="144"
  ["mipmap-xxxhdpi"]="192"
)

# Generate icons for user app
for dir in "${!SIZES[@]}"; do
  size="${SIZES[$dir]}"
  output_dir="android/app/src/main/res/$dir"
  mkdir -p "$output_dir"
  
  if command -v convert &> /dev/null; then
    # Resize and add padding
    convert "$TEMP_LOGO" -resize "${size}x${size}" -gravity center \
      -background none -extent "${size}x${size}" \
      "$output_dir/ic_launcher.png"
    
    # Round icon variant
    convert "$TEMP_LOGO" -resize "${size}x${size}" -gravity center \
      -background none -extent "${size}x${size}" \
      "$output_dir/ic_launcher_round.png"
  else
    # Fallback: just copy the logo
    cp "$TEMP_LOGO" "$output_dir/ic_launcher.png"
    cp "$TEMP_LOGO" "$output_dir/ic_launcher_round.png"
  fi
  
  echo "✅ Generated ${dir}/ic_launcher.png (${size}x${size})"
done

# Generate icons for admin app
for dir in "${!SIZES[@]}"; do
  size="${SIZES[$dir]}"
  output_dir="south-admin/android/app/src/main/res/$dir"
  mkdir -p "$output_dir"
  
  if command -v convert &> /dev/null; then
    convert "$TEMP_LOGO" -resize "${size}x${size}" -gravity center \
      -background none -extent "${size}x${size}" \
      "$output_dir/ic_launcher.png"
    convert "$TEMP_LOGO" -resize "${size}x${size}" -gravity center \
      -background none -extent "${size}x${size}" \
      "$output_dir/ic_launcher_round.png"
  else
    cp "$TEMP_LOGO" "$output_dir/ic_launcher.png"
    cp "$TEMP_LOGO" "$output_dir/ic_launcher_round.png"
  fi
  
  echo "✅ Generated admin ${dir}/ic_launcher.png (${size}x${size})"
done

# Also update foreground icons (adaptive icons)
for dir in "${!SIZES[@]}"; do
  size="${SIZES[$dir]}"
  fg_size=$((size * 54 / 100))  # 54% for adaptive icon foreground
  
  for app_dir in "android" "south-admin/android"; do
    output_dir="$app_dir/app/src/main/res/$dir"
    mkdir -p "$output_dir"
    
    if command -v convert &> /dev/null; then
      convert "$TEMP_LOGO" -resize "${fg_size}x${fg_size}" -gravity center \
        -background none -extent "${size}x${size}" \
        "$output_dir/ic_launcher_foreground.png"
    fi
  done
done

# Clean up
rm -f "$TEMP_LOGO"

echo ""
echo "🎉 Icon generation complete!"
