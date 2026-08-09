/**
 * Google Drive REST API helper — appDataFolder only.
 *
 * The `appDataFolder` space is private to this app and not visible in the
 * user's Drive file browser. Files are deleted when the app is uninstalled
 * but survive device replacement as long as the Google account is intact.
 *
 * Token notes:
 *   All functions accept a raw access token obtained via expo-auth-session
 *   with the `https://www.googleapis.com/auth/drive.appdata` scope.
 *   When the token has expired the Drive endpoints return 401; callers
 *   should catch that and prompt the user to reconnect.
 */

const BACKUP_FILE_NAME = 'daily5_backup.d5b';
const BOUNDARY = 'daily5bnd';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DriveFile {
  id: string;
  name: string;
  modifiedTime: string;
}

export type DriveError = 'unauthorised' | 'network' | 'not_found' | 'unknown';

export interface DriveResult<T> {
  ok: boolean;
  data?: T;
  error?: DriveError;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function errorKind(status: number): DriveError {
  if (status === 401 || status === 403) return 'unauthorised';
  if (status === 404) return 'not_found';
  return 'unknown';
}

function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` };
}

// ─── List backups ─────────────────────────────────────────────────────────────

/**
 * List all backup files stored in this app's Drive appDataFolder.
 * Returns the most-recently modified file first.
 */
export async function listBackupFiles(
  accessToken: string,
): Promise<DriveResult<DriveFile[]>> {
  try {
    const q = encodeURIComponent(`name='${BACKUP_FILE_NAME}'`);
    const fields = encodeURIComponent('files(id,name,modifiedTime)');
    const url = `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${q}&fields=${fields}`;
    const res = await fetch(url, { headers: authHeader(accessToken) });
    if (!res.ok) return { ok: false, error: errorKind(res.status) };
    const json = await res.json();
    const files: DriveFile[] = (json.files ?? []);
    files.sort((a, b) => b.modifiedTime.localeCompare(a.modifiedTime));
    return { ok: true, data: files };
  } catch {
    return { ok: false, error: 'network' };
  }
}

// ─── Upload ───────────────────────────────────────────────────────────────────

/**
 * Upload (create or update) the backup file in Drive.
 * Pass `existingFileId` to update an existing file instead of creating one.
 * `content` should be the JSON string of the BackupPayload.
 */
export async function uploadBackupToDrive(
  accessToken: string,
  content: string,
  existingFileId?: string,
): Promise<DriveResult<DriveFile>> {
  try {
    const metadata = JSON.stringify(
      existingFileId
        ? { name: BACKUP_FILE_NAME }
        : { name: BACKUP_FILE_NAME, parents: ['appDataFolder'] },
    );

    const body = [
      `--${BOUNDARY}`,
      'Content-Type: application/json; charset=UTF-8',
      '',
      metadata,
      `--${BOUNDARY}`,
      'Content-Type: text/plain; charset=UTF-8',
      '',
      content,
      `--${BOUNDARY}--`,
    ].join('\r\n');

    const url = existingFileId
      ? `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=multipart`
      : `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart`;

    const res = await fetch(url, {
      method: existingFileId ? 'PATCH' : 'POST',
      headers: {
        ...authHeader(accessToken),
        'Content-Type': `multipart/related; boundary=${BOUNDARY}`,
      },
      body,
    });

    if (!res.ok) return { ok: false, error: errorKind(res.status) };
    const file = await res.json();
    return {
      ok: true,
      data: {
        id: file.id,
        name: file.name ?? BACKUP_FILE_NAME,
        modifiedTime: file.modifiedTime ?? new Date().toISOString(),
      },
    };
  } catch {
    return { ok: false, error: 'network' };
  }
}

// ─── Download ─────────────────────────────────────────────────────────────────

/**
 * Download the content of a Drive file by ID.
 * Returns the raw string content (JSON-encoded BackupPayload).
 */
export async function downloadBackupFromDrive(
  accessToken: string,
  fileId: string,
): Promise<DriveResult<string>> {
  try {
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      { headers: authHeader(accessToken) },
    );
    if (!res.ok) return { ok: false, error: errorKind(res.status) };
    const text = await res.text();
    return { ok: true, data: text };
  } catch {
    return { ok: false, error: 'network' };
  }
}

// ─── Delete ───────────────────────────────────────────────────────────────────

/** Permanently delete a Drive file. Silently ignores 404. */
export async function deleteBackupFromDrive(
  accessToken: string,
  fileId: string,
): Promise<DriveResult<void>> {
  try {
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}`,
      { method: 'DELETE', headers: authHeader(accessToken) },
    );
    if (!res.ok && res.status !== 404) return { ok: false, error: errorKind(res.status) };
    return { ok: true };
  } catch {
    return { ok: false, error: 'network' };
  }
}
