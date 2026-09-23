/* eslint-disable @typescript-eslint/no-require-imports */
const path = require("path");
const fs = require("fs");
const sharp = require("d:/stalk/client-bdbook/node_modules/sharp");

const svgPath = "d:/stalk/client-bdbook/public/stalk.svg";
const assetsDir = path.join(__dirname, "..", "assets", "images");

async function generateAssets() {
  console.log("Generating Stalk brand icons & splash screen...");

  // 1. Render high-res full logo (width 1200)
  const fullLogoBuffer = await sharp(svgPath)
    .resize(1200)
    .png()
    .toBuffer();

  // Write splash-icon.png (Full Stalk Wordmark with icon)
  const splashPath = path.join(assetsDir, "splash-icon.png");
  await sharp(fullLogoBuffer)
    .resize(800)
    .toFile(splashPath);
  console.log("Created splash-icon.png");

  const meta = await sharp(fullLogoBuffer).metadata();
  const extractWidth = Math.min(Math.round(meta.width * 0.28), meta.width);
  const extractHeight = meta.height;

  // 2. Extract and trim the signature 'S' Eye Emblem
  const sMarkTrimmed = await sharp(fullLogoBuffer)
    .extract({ left: 0, top: 0, width: extractWidth, height: extractHeight })
    .trim()
    .toBuffer();

  // 3. Generate 1024x1024 App Icon (icon.png)
  // Clean white background with centered Stalk 'S' emblem
  const sMarkForIcon = await sharp(sMarkTrimmed)
    .resize(600, 600, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  const iconPath = path.join(assetsDir, "icon.png");
  await sharp({
    create: {
      width: 1024,
      height: 1024,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .composite([
      {
        input: sMarkForIcon,
        gravity: "center",
      },
    ])
    .png()
    .toFile(iconPath);
  console.log("Created icon.png (1024x1024)");

  // 4. Generate Android Adaptive Icon Foreground (android-icon-foreground.png)
  // Adaptive icons need safe margins (diameter ~66%)
  const sMarkForAdaptive = await sharp(sMarkTrimmed)
    .resize(480, 480, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  const adaptiveForegroundPath = path.join(assetsDir, "android-icon-foreground.png");
  await sharp({
    create: {
      width: 1024,
      height: 1024,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      {
        input: sMarkForAdaptive,
        gravity: "center",
      },
    ])
    .png()
    .toFile(adaptiveForegroundPath);
  console.log("Created android-icon-foreground.png");

  // 5. Generate Android Adaptive Icon Background (android-icon-background.png)
  const adaptiveBackgroundPath = path.join(assetsDir, "android-icon-background.png");
  await sharp({
    create: {
      width: 1024,
      height: 1024,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .png()
    .toFile(adaptiveBackgroundPath);
  console.log("Created android-icon-background.png");

  // 6. Generate Favicon (32x32)
  const faviconPath = path.join(assetsDir, "favicon.png");
  await sharp(sMarkTrimmed)
    .resize(32, 32, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(faviconPath);
  console.log("Created favicon.png");

  console.log("All Stalk brand assets successfully generated!");
}

generateAssets().catch((err) => {
  console.error("Error generating brand assets:", err);
  process.exit(1);
});
