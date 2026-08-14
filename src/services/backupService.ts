import { Directory, File, Paths } from 'expo-file-system';
import * as LegacyFileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import { createLocalBackupPayload, importLocalBackupPayload } from '../storage/database';
import type { LocalBackupImportResult, LocalBackupPayload } from '../types/backup';

const BACKUP_DIRECTORY = 'lookboogie-backups';

export async function exportLocalBackupFile() {
  const payload = await createLocalBackupPayload();
  const backupDirectory = new Directory(Paths.cache, BACKUP_DIRECTORY);
  backupDirectory.create({ idempotent: true, intermediates: true });

  const fileName = `lookboogie-backup-${formatBackupDate(new Date())}.json`;
  const backupFile = new File(backupDirectory, fileName);
  backupFile.create({ overwrite: true });
  backupFile.write(JSON.stringify(payload, null, 2));

  const canShare = await Sharing.isAvailableAsync();

  if (canShare) {
    await Sharing.shareAsync(backupFile.uri, {
      mimeType: 'application/json',
      dialogTitle: '룩부기 백업 내보내기',
      UTI: 'public.json',
    });
  }

  return {
    uri: backupFile.uri,
    shared: canShare,
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

  return importLocalBackupPayload(parsedPayload);
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
