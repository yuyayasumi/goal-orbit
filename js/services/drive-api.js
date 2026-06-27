// ==========================================
// Orbit v3 - Google Drive API Service
// ==========================================

const CLIENT_ID = '956745256349-11j7i1lr1o2kaij1nekto7nje29v2aam.apps.googleusercontent.com';
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
const SCOPES = 'https://www.googleapis.com/auth/drive.file email profile';
const BACKUP_FILENAME = 'orbit-cloud-backup.json';

let tokenClient;
let gapiInited = false;
let gisInited = false;
let isAuthorized = false;
let currentFileId = null;
let statusCallback = null;
let currentUserInfo = null;

export async function fetchUserInfo() {
  if (!isAuthorized) return null;
  try {
    const accessToken = gapi.client.getToken().access_token;
    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });
    if (res.ok) {
      currentUserInfo = await res.json();
      return currentUserInfo;
    }
  } catch (err) {
    console.error('Error fetching user info', err);
  }
  return null;
}

export function getUserInfo() {
  return currentUserInfo;
}

export function initDriveApi(onStatusChange) {
  statusCallback = onStatusChange;
  
  // gapi script loaded?
  if (typeof gapi !== 'undefined' && typeof google !== 'undefined') {
    gapi.load('client', initializeGapiClient);
    initializeGisClient();
  } else {
    // Wait and retry if scripts are not loaded yet
    setTimeout(() => initDriveApi(onStatusChange), 500);
  }
}

async function initializeGapiClient() {
  try {
    await gapi.client.init({
      discoveryDocs: [DISCOVERY_DOC],
    });
    gapiInited = true;
    checkIfReady();
  } catch (err) {
    console.error('Error initializing GAPI client', err);
    updateStatus('error');
  }
}

function initializeGisClient() {
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPES,
    callback: async (resp) => {
      if (resp.error !== undefined) {
        throw (resp);
      }
      isAuthorized = true;
      await fetchUserInfo();
      updateStatus('authorized');
      await findExistingBackupFile();
    },
  });
  gisInited = true;
  checkIfReady();
}

function checkIfReady() {
  if (gapiInited && gisInited) {
    updateStatus('ready'); // Ready to log in
  }
}

function updateStatus(status) {
  if (statusCallback) statusCallback(status);
}

export function handleAuthClick() {
  if (gapi.client.getToken() === null) {
    tokenClient.requestAccessToken({prompt: 'consent'});
  } else {
    tokenClient.requestAccessToken({prompt: ''});
  }
}

export function handleSignoutClick() {
  const token = gapi.client.getToken();
  if (token !== null) {
    google.accounts.oauth2.revoke(token.access_token);
    gapi.client.setToken('');
    isAuthorized = false;
    currentFileId = null;
    currentUserInfo = null;
    updateStatus('ready');
  }
}

export async function findExistingBackupFile() {
  try {
    const response = await gapi.client.drive.files.list({
      q: `name='${BACKUP_FILENAME}' and trashed=false`,
      fields: 'files(id, name, modifiedTime)',
      spaces: 'drive',
    });
    const files = response.result.files;
    if (files && files.length > 0) {
      currentFileId = files[0].id;
      return files[0];
    } else {
      currentFileId = null;
      return null;
    }
  } catch (err) {
    console.error('Error finding backup file', err);
    return null;
  }
}

export async function downloadBackup() {
  if (!isAuthorized || !currentFileId) return null;
  try {
    const response = await gapi.client.drive.files.get({
      fileId: currentFileId,
      alt: 'media'
    });
    return typeof response.result === 'string' ? JSON.parse(response.result) : response.result;
  } catch (err) {
    console.error('Error downloading backup', err);
    return null;
  }
}

export async function uploadBackup(jsonData) {
  if (!isAuthorized) return;
  updateStatus('syncing');

  const fileMetadata = {
    name: BACKUP_FILENAME,
    mimeType: 'application/json'
  };
  
  const fileContent = JSON.stringify(jsonData);
  const file = new Blob([fileContent], { type: 'application/json' });

  try {
    if (currentFileId) {
      // Update existing file
      await updateFile(currentFileId, fileMetadata, file);
    } else {
      // Create new file
      await createFile(fileMetadata, file);
    }
    updateStatus('synced');
  } catch (err) {
    console.error('Error uploading backup', err);
    updateStatus('error');
  }
}

// Multipart upload functions for Drive API
async function createFile(metadata, fileBlob) {
  const accessToken = gapi.client.getToken().access_token;
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', fileBlob);

  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: form,
  });
  const data = await res.json();
  currentFileId = data.id;
}

async function updateFile(fileId, metadata, fileBlob) {
  const accessToken = gapi.client.getToken().access_token;
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', fileBlob);

  await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: form,
  });
}

export function isDriveAuthorized() {
  return isAuthorized;
}
