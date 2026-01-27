export function imageBitmapToBlob(imageBitmap: ImageBitmap) {
  const canvas = document.createElement('canvas');
  canvas.width = imageBitmap.width;
  canvas.height = imageBitmap.height;
  const ctx = canvas.getContext('2d');
  ctx?.drawImage(imageBitmap, 0, 0);
  return new Promise<Blob>(resolve =>
    canvas.toBlob(blob => resolve(blob!), 'image/png', 1)
  );
}
