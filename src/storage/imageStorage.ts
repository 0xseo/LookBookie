import { Directory, File, Paths } from 'expo-file-system';

const WARDROBE_IMAGE_DIRECTORY = 'lookbookie-clothes';

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
