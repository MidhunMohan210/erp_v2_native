const cloudName = (process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME ?? "").trim();
const uploadPreset = (process.env.EXPO_PUBLIC_CLOUDINARY_PRESET ?? "").trim();

type UploadAsset = {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
};

export async function uploadImageToCloudinary(asset: UploadAsset) {
  if (!cloudName || !uploadPreset) {
    throw new Error(
      "Cloudinary is not configured. Set EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME and EXPO_PUBLIC_CLOUDINARY_PRESET.",
    );
  }

  if (!asset.uri) {
    throw new Error("No image selected for upload.");
  }

  const formData = new FormData();
  formData.append("file", {
    uri: asset.uri,
    name: asset.fileName ?? "company-logo.jpg",
    type: asset.mimeType ?? "image/jpeg",
  } as unknown as Blob);
  formData.append("upload_preset", uploadPreset);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    {
      method: "POST",
      body: formData,
    },
  );

  let data: { secure_url?: string; error?: { message?: string } } | null = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(
      data?.error?.message ??
        `Logo upload failed with status ${response.status}.`,
    );
  }

  if (!data?.secure_url) {
    throw new Error("Logo upload failed: missing uploaded image URL.");
  }

  return data.secure_url;
}
