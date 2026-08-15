import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

const WARDROBE_IMAGE_DIRECTORY = 'lookboogie-clothes';
const EDITED_IMAGE_DIRECTORY = 'lookboogie-edits';
const MAX_IMAGE_WIDTH = 1400;

export type CropMode = 'original' | 'square' | 'portrait45' | 'portrait34';

export type CropRect = {
  originX: number;
  originY: number;
  width: number;
  height: number;
};

export type ProcessedWardrobeImage = {
  uri: string;
  width: number;
  height: number;
  backgroundRemoved: boolean;
};

export type RestoredWardrobeImage = {
  uri: string | null;
  source: 'local' | 'downloaded' | 'remote' | 'missing';
};

export async function processWardrobeImage(sourceUri: string): Promise<ProcessedWardrobeImage> {
  const probe = await ImageManipulator.manipulate(sourceUri).renderAsync();
  const context = ImageManipulator.manipulate(sourceUri);

  if (probe.width > MAX_IMAGE_WIDTH) {
    context.resize({ width: MAX_IMAGE_WIDTH });
  }

  const renderedImage = await context.renderAsync();
  const result = await renderedImage.saveAsync({
    format: SaveFormat.PNG,
    compress: 0.86,
  });

  return {
    uri: result.uri,
    width: result.width,
    height: result.height,
    backgroundRemoved: false,
  };
}

export async function cropWardrobeImage(sourceUri: string, mode: CropMode) {
  const probe = await ImageManipulator.manipulate(sourceUri).renderAsync();

  if (mode === 'original') {
    return {
      uri: sourceUri,
      width: probe.width,
      height: probe.height,
      backgroundRemoved: false,
    };
  }

  const targetRatio = mode === 'square' ? 1 : mode === 'portrait45' ? 4 / 5 : 3 / 4;
  const currentRatio = probe.width / probe.height;
  let cropWidth = probe.width;
  let cropHeight = probe.height;

  if (currentRatio > targetRatio) {
    cropWidth = Math.floor(probe.height * targetRatio);
  } else {
    cropHeight = Math.floor(probe.width / targetRatio);
  }

  const originX = Math.max(0, Math.floor((probe.width - cropWidth) / 2));
  const originY = Math.max(0, Math.floor((probe.height - cropHeight) / 2));
  const context = ImageManipulator.manipulate(sourceUri).crop({
    originX,
    originY,
    width: cropWidth,
    height: cropHeight,
  });
  const renderedImage = await context.renderAsync();
  const result = await renderedImage.saveAsync({
    format: SaveFormat.PNG,
    compress: 1,
  });

  return {
    uri: result.uri,
    width: result.width,
    height: result.height,
    backgroundRemoved: false,
  };
}

export async function cropWardrobeImageToRect(sourceUri: string, rect: CropRect) {
  const probe = await ImageManipulator.manipulate(sourceUri).renderAsync();
  const safeRect = {
    originX: clamp(Math.floor(rect.originX), 0, Math.max(0, probe.width - 1)),
    originY: clamp(Math.floor(rect.originY), 0, Math.max(0, probe.height - 1)),
    width: clamp(Math.floor(rect.width), 1, probe.width),
    height: clamp(Math.floor(rect.height), 1, probe.height),
  };

  safeRect.width = Math.min(safeRect.width, probe.width - safeRect.originX);
  safeRect.height = Math.min(safeRect.height, probe.height - safeRect.originY);

  const context = ImageManipulator.manipulate(sourceUri).crop(safeRect);
  const renderedImage = await context.renderAsync();
  const result = await renderedImage.saveAsync({
    format: SaveFormat.PNG,
    compress: 1,
  });

  return {
    uri: result.uri,
    width: result.width,
    height: result.height,
    backgroundRemoved: false,
  };
}

export async function saveWardrobeImage(sourceUri: string) {
  const imageDirectory = new Directory(Paths.document, WARDROBE_IMAGE_DIRECTORY);
  imageDirectory.create({ idempotent: true, intermediates: true });

  const sourceFile = new File(sourceUri);
  const extension = getFileExtension(sourceUri);
  const targetFile = new File(imageDirectory, `clothing-${Date.now()}.${extension}`);

  await sourceFile.copy(targetFile, { overwrite: true });

  return targetFile.uri;
}

export async function restoreWardrobeImageFromBackup(
  localImagePath: string | null | undefined,
  remoteImageUrl: string | null | undefined,
): Promise<RestoredWardrobeImage> {
  const localPath = localImagePath?.trim() ?? '';
  const remoteUrl = getBackupRemoteImageUrl(localPath, remoteImageUrl);

  if (isAvailableLocalImage(localPath)) {
    return { uri: localPath, source: 'local' };
  }

  if (!remoteUrl) {
    return { uri: null, source: 'missing' };
  }

  const imageDirectory = new Directory(Paths.document, WARDROBE_IMAGE_DIRECTORY);
  imageDirectory.create({ idempotent: true, intermediates: true });
  const extension = getFileExtension(remoteUrl);
  const uniqueSuffix = Math.random().toString(36).slice(2, 8);
  const targetFile = new File(
    imageDirectory,
    `restored-clothing-${Date.now()}-${uniqueSuffix}.${extension}`,
  );

  try {
    const downloadedFile = await File.downloadFileAsync(remoteUrl, targetFile, {
      idempotent: true,
    });

    if (downloadedFile.exists && (downloadedFile.size ?? 0) > 0) {
      return { uri: downloadedFile.uri, source: 'downloaded' };
    }
  } catch {
    // The public cloud URL still lets the image render while the device is online.
  }

  return { uri: remoteUrl, source: 'remote' };
}

export async function readImageAsDataUrl(sourceUri: string) {
  const sourceFile = new File(sourceUri);
  const extension = getFileExtension(sourceUri);
  const base64 = await sourceFile.base64();

  return `data:${getContentType(extension)};base64,${base64}`;
}

export function saveEditedDataUrlImage(dataUrl: string) {
  const match = dataUrl.match(/^data:image\/png;base64,(.+)$/);

  if (!match?.[1]) {
    throw new Error('편집된 이미지 형식이 PNG가 아니에요.');
  }

  const imageDirectory = new Directory(Paths.cache, EDITED_IMAGE_DIRECTORY);
  imageDirectory.create({ idempotent: true, intermediates: true });

  const targetFile = new File(imageDirectory, `edited-clothing-${Date.now()}.png`);
  targetFile.create({ overwrite: true });
  targetFile.write(match[1], { encoding: 'base64' });

  return targetFile.uri;
}

function getFileExtension(uri: string) {
  const cleanUri = uri.split('?')[0] ?? uri;
  const match = cleanUri.match(/\.([a-zA-Z0-9]+)$/);

  return match?.[1]?.toLowerCase() ?? 'jpg';
}

function isAvailableLocalImage(uri: string) {
  if (!uri || !/^file:\/\//i.test(uri)) {
    return false;
  }

  try {
    const file = new File(uri);
    return file.exists && (file.size ?? 0) > 0;
  } catch {
    return false;
  }
}

function getBackupRemoteImageUrl(localImagePath: string, remoteImageUrl?: string | null) {
  const remoteUrl = remoteImageUrl?.trim() ?? '';

  if (/^https:\/\//i.test(remoteUrl)) {
    return remoteUrl;
  }

  return /^https:\/\//i.test(localImagePath) ? localImagePath : null;
}

function getContentType(extension: string) {
  if (extension === 'jpg' || extension === 'jpeg') {
    return 'image/jpeg';
  }

  if (extension === 'webp') {
    return 'image/webp';
  }

  return 'image/png';
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
