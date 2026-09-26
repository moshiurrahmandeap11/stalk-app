import * as ImagePicker from "expo-image-picker";

export interface CompressedMediaResult {
  uri: string;
  name: string;
  type: string;
  size?: number;
}

let ImageManipulatorModule: any = null;
try {
  ImageManipulatorModule = require("expo-image-manipulator");
} catch {
  // ExpoImageManipulator native module not available in current runtime
}

/**
 * Optimizes and compresses images to avoid uploading massive 4K/raw files.
 * Uses expo-image-manipulator when available, or seamlessly falls back to
 * the picker asset (which is already compressed via quality: 0.8 in ImagePicker).
 */
export async function optimizeImage(
  asset: ImagePicker.ImagePickerAsset
): Promise<CompressedMediaResult> {
  const isVideo = asset.type === "video";
  const fileExt = asset.uri.split(".").pop() || (isVideo ? "mp4" : "jpg");

  if (isVideo) {
    return {
      uri: asset.uri,
      name: `video_${Date.now()}.${fileExt}`,
      type: "video/mp4",
      size: asset.fileSize,
    };
  }

  if (ImageManipulatorModule && ImageManipulatorModule.manipulateAsync) {
    try {
      const maxWidth = 1920;
      const actions: any[] = [];
      if (asset.width && asset.width > maxWidth) {
        actions.push({ resize: { width: maxWidth } });
      }

      const manipResult = await ImageManipulatorModule.manipulateAsync(
        asset.uri,
        actions,
        {
          compress: 0.82,
          format: ImageManipulatorModule.SaveFormat?.JPEG || "jpeg",
        }
      );

      return {
        uri: manipResult.uri,
        name: `image_${Date.now()}.jpg`,
        type: "image/jpeg",
        size: asset.fileSize,
      };
    } catch {
      // Fallback
    }
  }

  return {
    uri: asset.uri,
    name: asset.fileName || `image_${Date.now()}.${fileExt}`,
    type: "image/jpeg",
    size: asset.fileSize,
  };
}
