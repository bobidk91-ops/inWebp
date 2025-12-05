import { ProcessingOptions } from '../types';

export const slugify = (text: string): string => {
  const rus = "щ   ш  ч  ц  ю  я  ё  ж  ъ  ы  э  а б в г д е з и й к л м н о п р с т у ф х ь".split(/ +/g);
  const eng = "shh sh ch cz yu ya yo zh `` y' e` a b v g d e z i j k l m n o p r s t u f x `".split(/ +/g);
  
  let slug = text.toLowerCase();
  for (let i = 0; i < rus.length; i++) {
      slug = slug.split(rus[i]).join(eng[i]);
  }
  
  return slug
      .replace(/\s+/g, '-')     // Replace spaces with dashes
      .replace(/[^\w\-]+/g, '') // Remove non-word chars
      .replace(/\-\-+/g, '-')   // Replace multiple dashes
      .replace(/^-+/, '')       // Trim start
      .replace(/-+$/, '');      // Trim end
};

export const processImage = async (
  fileUrl: string, 
  options: ProcessingOptions
): Promise<{ processedUrl: string; processedSize: number; width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = fileUrl;
    img.crossOrigin = "anonymous";
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const width = img.width;
      const height = img.height;

      let sx = 0, sy = 0, sWidth = width, sHeight = height;

      // Crop logic (4:3 aspect ratio)
      if (options.cropTo43) {
        const targetRatio = 4 / 3;
        const currentRatio = width / height;

        if (currentRatio > targetRatio) {
          sWidth = height * targetRatio;
          sx = (width - sWidth) / 2;
        } else {
          sHeight = width / targetRatio;
          sy = (height - sHeight) / 2;
        }
      }

      let dWidth = sWidth;
      let dHeight = sHeight;

      // Resize logic
      if (dWidth > options.maxWidth) {
        const ratio = options.maxWidth / dWidth;
        dWidth = options.maxWidth;
        dHeight = dHeight * ratio;
      }

      canvas.width = dWidth;
      canvas.height = dHeight;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      // White background for transparency
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, dWidth, dHeight);

      // Draw image
      if (options.cropTo43) {
        ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, dWidth, dHeight);
      } else {
        ctx.drawImage(img, 0, 0, width, height, 0, 0, dWidth, dHeight);
      }

      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Conversion failed'));
          return;
        }
        const processedUrl = URL.createObjectURL(blob);
        resolve({
          processedUrl,
          processedSize: blob.size,
          width: dWidth,
          height: dHeight
        });
      }, options.format, options.quality);
    };
    
    img.onerror = (e) => reject(e);
  });
};

export const formatSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};