import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

const WARDROBE_IMAGE_DIRECTORY = 'lookbookie-clothes';
const MAX_IMAGE_WIDTH = 1400;

export type ProcessedWardrobeImage = {
  uri: string;
  width: number;
  height: number;
  backgroundRemoved: boolean;
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

export async function saveWardrobeImage(sourceUri: string) {
  const imageDirectory = new Directory(Paths.document, WARDROBE_IMAGE_DIRECTORY);
  imageDirectory.create({ idempotent: true, intermediates: true });

  const sourceFile = new File(sourceUri);
  const extension = getFileExtension(sourceUri);
  const targetFile = new File(imageDirectory, `clothing-${Date.now()}.${extension}`);

  await sourceFile.copy(targetFile, { overwrite: true });

  return targetFile.uri;
}

function getFileExtension(uri: string) {
  const cleanUri = uri.split('?')[0] ?? uri;
  const match = cleanUri.match(/\.([a-zA-Z0-9]+)$/);

  return match?.[1]?.toLowerCase() ?? 'jpg';
}
