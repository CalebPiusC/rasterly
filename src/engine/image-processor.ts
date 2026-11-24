import sharp from 'sharp';
import { RenderError } from './errors.js';
import type { NormalizedRenderConfig, OutputFormat } from './types.js';

export interface ProcessedImage {
  buffer: Buffer;
  width: number;
  height: number;
}

/**
 * Convert a raw PNG screenshot buffer into the requested output format,
 * applying background flattening, scaling and quality.
 */
export async function processImage(
  input: Buffer,
  config: NormalizedRenderConfig,
): Promise<ProcessedImage> {
  try {
    let pipeline = sharp(input, { failOn: 'none' });

    if (!config.transparent && config.format !== 'png') {
      pipeline = pipeline.flatten({ background: config.backgroundColor });
    } else if (!config.transparent && config.format === 'png') {
      pipeline = pipeline.flatten({ background: config.backgroundColor });
    }

    const scale = config.scale;
    if (scale > 1) {
      pipeline = config.fullPage
        ? pipeline.resize({ width: Math.round(config.width * scale) })
        : pipeline.resize({
            width: Math.round(config.width * scale),
            height: Math.round(config.height * scale),
            fit: 'fill',
          });
    }

    switch (config.format) {
      case 'jpeg':
        pipeline = pipeline.jpeg({ quality: config.quality, mozjpeg: true });
        break;
      case 'webp':
        pipeline = pipeline.webp({ quality: config.quality });
        break;
      case 'png':
      default:
        pipeline = pipeline.png({ compressionLevel: 9 });
        break;
    }

    const { data, info } = await pipeline.toBuffer({ resolveWithObject: true });
    return { buffer: data, width: info.width, height: info.height };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new RenderError('IMAGE_PROCESSING_ERROR', 'Failed to process image', message, error);
  }
}

export function supportsTransparency(format: OutputFormat): boolean {
  return format === 'png' || format === 'webp';
}