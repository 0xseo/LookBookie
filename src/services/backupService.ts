import * as DocumentPicker from 'expo-document-picker';
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { createLocalBackupPayload, importLocalBackupPayload } from '../storage/database';
import type { LocalBackupImportResult, LocalBackupPayload } from '../types/backup';

const BACKUP_DIRECTORY = 'lookbookie-backups';

export async function exportLocalBackupFile() {
  const payload = await createLocalBackupPayload();
  const backupDirectory = new Directory(Paths.cache, BACKUP_DIRECTORY);
  backupDirectory.create({ idempotent: true, intermediates: true });

  const fileName = `lookbookie-backup-${formatBackupDate(new Date())}.json`;
  const backupFile = new File(backupDirectory, fileName);
  backupFile.create({ overwrite: true });
  backupFile.write(JSON.stringify(payload, null, 2));

  const canShare = await Sharing.isAvailableAsync();

  if (canShare) {
    await Sharing.shareAsync(backupFile.uri, {
      mimeType: 'application/json',
      dialogTitle: '룩북이 백업 내보내기',
      UTI: 'public.json',
    });
  }

  return {
    uri: backupFile.uri,
    shared: canShare,
  };
}

export async function importLocalBackupFile(): Promise<LocalBackupImportResult | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/json',
    copyToCacheDirectory: true,
  });

  if (result.canceled) {
    return null;
  }

  const pickedFile = new File(result.assets[0].uri);
  const rawPayload = await pickedFile.text();
  const parsedPayload = JSON.parse(rawPayload) as LocalBackupPayload;

  return importLocalBackupPayload(parsedPayload);
}

function formatBackupDate(date: Date) {
  return date.toISOString().replace(/[:.]/g, '-');
}
