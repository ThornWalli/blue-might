export function createCheckerboardCanvas(
  size: number,
  squareSize: number,
  color1: string,
  color2: string
) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Could not get canvas context');
  }

  context.fillStyle = color1;
  context.fillRect(0, 0, size, size);

  context.fillStyle = color2;
  for (let y = 0; y < size / squareSize; y++) {
    for (let x = 0; x < size / squareSize; x++) {
      if ((x + y) % 2 === 0) {
        context.fillRect(
          x * squareSize,
          y * squareSize,
          squareSize,
          squareSize
        );
      }
    }
  }
  return canvas;
}

export function resizeCanvas(
  canvas: HTMLCanvasElement | OffscreenCanvas,
  width: number,
  height?: number
) {
  if (!width && height) {
    width = height * (canvas.width / canvas.height);
  } else if (!height) {
    height = width * (canvas.height / canvas.width);
  }
  const resizedCanvas = new OffscreenCanvas(width, height);
  const ctx = resizedCanvas.getContext(
    '2d'
  ) as OffscreenCanvasRenderingContext2D;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(canvas, 0, 0, width, height);
  return resizedCanvas;
}
