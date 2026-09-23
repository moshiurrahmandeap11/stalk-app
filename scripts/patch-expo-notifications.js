const fs = require("fs");
const path = require("path");

const targetFile = path.join(
  __dirname,
  "..",
  "node_modules",
  "expo-notifications",
  "build",
  "warnOfExpoGoPushUsage.js"
);

if (fs.existsSync(targetFile)) {
  let content = fs.readFileSync(targetFile, "utf8");
  if (content.includes("throw new Error(message);")) {
    content = content.replace(
      "throw new Error(message);",
      "didWarn = true; console.warn(message);"
    );
    fs.writeFileSync(targetFile, content, "utf8");
    console.log("[patch-expo-notifications] Successfully patched expo-notifications for Expo Go.");
  }
}

