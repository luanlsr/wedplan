type CompressOptions = {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  outputType?: 'image/webp' | 'image/jpeg';
};

const defaultOptions: Required<CompressOptions> = {
  maxWidth: 1920,
  maxHeight: 1920,
  quality: 0.82,
  outputType: 'image/webp',
};

const loadImage = (file: File) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Imagem inválida.'));
    };
    image.src = objectUrl;
  });

const canvasToBlob = (canvas: HTMLCanvasElement, type: string, quality: number) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));

const getTargetSize = (width: number, height: number, maxWidth: number, maxHeight: number) => {
  const scale = Math.min(maxWidth / width, maxHeight / height, 1);
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
};

export const compressImageFile = async (file: File, options?: CompressOptions) => {
  const settings = { ...defaultOptions, ...options };

  if (!file.type.startsWith('image/') || file.type === 'image/gif' || file.type === 'image/svg+xml') {
    return {
      file,
      compressed: false,
      originalSize: file.size,
      compressedSize: file.size,
    };
  }

  try {
    const image = await loadImage(file);
    const size = getTargetSize(image.naturalWidth, image.naturalHeight, settings.maxWidth, settings.maxHeight);
    const canvas = document.createElement('canvas');
    canvas.width = size.width;
    canvas.height = size.height;

    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas indisponível.');

    context.drawImage(image, 0, 0, size.width, size.height);
    const blob = await canvasToBlob(canvas, settings.outputType, settings.quality);
    if (!blob || blob.size >= file.size) {
      return {
        file,
        compressed: false,
        originalSize: file.size,
        compressedSize: file.size,
      };
    }

    const extension = settings.outputType === 'image/webp' ? 'webp' : 'jpg';
    const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, `.${extension}`), {
      type: settings.outputType,
      lastModified: Date.now(),
    });

    return {
      file: compressedFile,
      compressed: true,
      originalSize: file.size,
      compressedSize: compressedFile.size,
    };
  } catch (error) {
    console.warn('[imageCompression] Não foi possível comprimir a imagem:', error);
    return {
      file,
      compressed: false,
      originalSize: file.size,
      compressedSize: file.size,
    };
  }
};
