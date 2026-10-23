import { IMAGE_JPEG_QUALITY, IMAGE_MAX_DIMENSION } from '../config';
import type { InputFile } from '../ai/extract';

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      resolve(dataUrl.split(',')[1] ?? '');
    };
    reader.onerror = () => {
      reject(reader.error ?? new Error('Could not read file.'));
    };
    reader.readAsDataURL(blob);
  });
}

async function downscale(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, IMAGE_MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Could not process image.'))),
      'image/jpeg',
      IMAGE_JPEG_QUALITY,
    ),
  );
}

/**
 * Prepares a file for upload. Images are downscaled in the browser before sending.
 * @param file - validated user file
 * @returns MIME type and base64 data
 */
export async function prepareFile(file: File): Promise<InputFile> {
  if (file.type.startsWith('image/')) {
    const blob = await downscale(file);
    return { mimeType: 'image/jpeg', data: await blobToBase64(blob) };
  }
  return { mimeType: file.type, data: await blobToBase64(file) };
}
