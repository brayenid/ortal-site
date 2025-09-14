import { cloudinary } from "@/lib/cloudinary";

export async function maybeUploadFile(file: File | null, folder: string): Promise<string | undefined> {
  if (!file) return undefined;
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const uploaded = await new Promise<any>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "auto" },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    stream.end(buffer);
  });
  return uploaded.secure_url as string;
}
