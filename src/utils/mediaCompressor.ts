import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";

export interface CompressedMediaResult {
  uri: string;
  name: string;
  type: string;
  size?: number;
}

/**
 * Optimizes and compresses images to avoid uploading massive 4K/raw files.
 * Resizes images to max 1920px width/height and compresses with quality 0.8 JPEG.
 */
export async function optimizeImage(
  asset: ImagePicker.ImagePickerAsset
): Promise<CompressedMediaResult> {
  try {
    const isVideo = asset.type === "video";
    if (isVideo) {
      // Videos are passed directly
      const fileExt = asset.uri.split(".").pop() || "mp4";
      return {
        uri: asset.uri,
        name: `video_${Date.now()}.${fileExt}`,
        type: "video/mp4",
        size: asset.fileSize,
      };
    }

    // Determine target dimensions
    const maxWidth = 1920;
    const actions: any[] = [];
    if (asset.width && asset.width > maxWidth) {
      actions.push({ resize: { width: maxWidth } });
    }

    const manipResult = await manipulateAsync(
      asset.uri,
      actions,
      {
        compress: 0.82,
        format: SaveFormat.JPEG,
      }
    );

    return {
      uri: manipResult.uri,
      name: `image_${Date.now()}.jpg`,
      type: "image/jpeg",
    };
  } catch (err) {
    console.warn("[MediaCompressor] Compression fallback to original asset:", err);
    const fileExt = asset.uri.split(".").pop() || "jpg";
    return {
      uri: asset.uri,
      name: `upload_${Date.now()}.${fileExt}`,
      type: asset.type === "video" ? "video/mp4" : "image/jpeg",
      size: asset.fileSize,
    };
  }
}
