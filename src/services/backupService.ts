import { Directory, File } from 'expo-file-system';
import * as LegacyFileSystem from 'expo-file-system/legacy';

import {
  createLocalBackupPayload,
  importLocalBackupPayload,
  listClothingItems,
  listOutfits,
  updateClothingItem,
  updateOutfit,
} from '../storage/database';
import { restoreWardrobeImageFromBackup } from '../storage/imageStorage';
import type { LocalBackupImportResult, LocalBackupPayload } from '../types/backup';

export async function exportLocalBackupFile() {
  const payload = await createLocalBackupPayload();
  const fileName = `lookboogie-backup-${formatBackupDate(new Date())}.json`;
  let destinationDirectory: Directory;

  try {
    destinationDirectory = await Directory.pickDirectoryAsync();
  } catch (error) {
    if (isFilePickerCancellation(error)) {
      return null;
    }

    throw error;
  }

  const backupFile = destinationDirectory.createFile(fileName, 'application/json');
  backupFile.write(JSON.stringify(payload, null, 2));

  return {
    uri: backupFile.uri,
    fileName: backupFile.name,
  };
}

export async function importLocalBackupFile(): Promise<LocalBackupImportResult | null> {
  const result = await File.pickFileAsync({
    mimeTypes: ['application/json', 'text/json', 'text/plain'],
  });

  if (result.canceled) {
    return null;
  }

  const rawPayload = await readBackupFileText(result.result);
  const parsedPayload = JSON.parse(rawPayload) as LocalBackupPayload;

  validateBackupPayload(parsedPayload);

  const preparedPayload = await prepareBackupImages(parsedPayload);
  const importResult = await importLocalBackupPayload(preparedPayload.payload);

  return {
    ...importResult,
    downloadedImageCount: preparedPayload.downloadedImageCount,
    remoteFallbackImageCount: preparedPayload.remoteFallbackImageCount,
    skippedImageCount: preparedPayload.skippedImageCount,
  };
}

export async function repairStoredBackupImagePaths() {
  const clothingItems = await listClothingItems('전체');
  const restoredImagePaths = new Map<string, string>();
  let repairedClothesCount = 0;

  for (const item of clothingItems) {
    const restoredImage = await restoreWardrobeImageFromBackup(
      item.localImagePath,
      item.remoteImageUrl,
    );

    if (!restoredImage.uri || restoredImage.uri === item.localImagePath) {
      continue;
    }

    restoredImagePaths.set(item.localImagePath, restoredImage.uri);
    await updateClothingItem({
      ...item,
      localImagePath: restoredImage.uri,
    });
    repairedClothesCount += 1;
  }

  if (restoredImagePaths.size === 0) {
    return repairedClothesCount;
  }

  const outfits = await listOutfits();

  for (const outfit of outfits) {
    let changed = false;
    const stickers = outfit.stickers.map((sticker) => {
      const restoredPath = restoredImagePaths.get(sticker.localImagePath);

      if (!restoredPath) {
        return sticker;
      }

      changed = true;
      return { ...sticker, localImagePath: restoredPath };
    });

    if (changed) {
      await updateOutfit({ ...outfit, stickers });
    }
  }

  return repairedClothesCount;
}

async function prepareBackupImages(payload: LocalBackupPayload) {
  const restoredImagePaths = new Map<string, string | null>();
  const clothes: LocalBackupPayload['clothes'] = [];
  let downloadedImageCount = 0;
  let remoteFallbackImageCount = 0;
  let skippedImageCount = 0;

  for (const item of payload.clothes) {
    const originalLocalPath = item.localImagePath?.trim() ?? '';
    const restoredImage = await restoreWardrobeImageFromBackup(
      originalLocalPath,
      item.remoteImageUrl,
    );

    if (originalLocalPath) {
      restoredImagePaths.set(originalLocalPath, restoredImage.uri);
    }

    if (item.remoteImageUrl) {
      restoredImagePaths.set(item.remoteImageUrl, restoredImage.uri);
    }

    if (!restoredImage.uri) {
      skippedImageCount += 1;
      continue;
    }

    if (restoredImage.source === 'downloaded') {
      downloadedImageCount += 1;
    } else if (restoredImage.source === 'remote') {
      remoteFallbackImageCount += 1;
    }

    clothes.push({
      ...item,
      localImagePath: restoredImage.uri,
    });
  }

  const outfits = payload.outfits.map((outfit) => ({
    ...outfit,
    stickers: outfit.stickers.flatMap((sticker) => {
      if (!restoredImagePaths.has(sticker.localImagePath)) {
        return [sticker];
      }

      const restoredPath = restoredImagePaths.get(sticker.localImagePath);
      return restoredPath ? [{ ...sticker, localImagePath: restoredPath }] : [];
    }),
  }));

  return {
    payload: {
      ...payload,
      clothes,
      outfits,
    },
    downloadedImageCount,
    remoteFallbackImageCount,
    skippedImageCount,
  };
}

function validateBackupPayload(payload: LocalBackupPayload) {
  if (
    payload.version !== 1 ||
    !Array.isArray(payload.clothes) ||
    !Array.isArray(payload.outfits)
  ) {
    throw new Error('지원하지 않는 백업 파일 형식이에요.');
  }
}

async function readBackupFileText(file: File) {
  try {
    return await file.text();
  } catch (primaryError) {
    try {
      return await LegacyFileSystem.readAsStringAsync(file.uri);
    } catch {
      throw new Error(
        primaryError instanceof Error
          ? `백업 파일을 읽지 못했어북. 파일 접근 권한이 거부됐어요. 파일 앱이나 다운로드 폴더에 저장된 JSON 백업 파일을 다시 선택해 주세요. (${primaryError.message})`
          : '백업 파일을 읽지 못했어북. 파일 앱이나 다운로드 폴더에 저장된 JSON 백업 파일을 다시 선택해 주세요.',
      );
    }
  }
}

function formatBackupDate(date: Date) {
  return date.toISOString().replace(/[:.]/g, '-');
}

function isFilePickerCancellation(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return /picker.*cancel|cancel.*picker|선택.*취소/i.test(message);
}
