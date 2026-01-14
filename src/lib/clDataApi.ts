/**
 * Centralized CL Data API client
 * Handles all communication with the CL Data API (cl-data-api.onrender.com)
 */

const CL_DATA_API_BASE_URL = process.env.CL_DATA_API_BASE_URL || 'https://cl-data-api.onrender.com';
const CL_DATA_API_KEY = process.env.CL_DATA_API_KEY;

if (!CL_DATA_API_KEY) {
  console.warn('CL_DATA_API_KEY is not set in environment variables');
}

/**
 * Make a request to the CL Data API
 */
async function clDataApiRequest(endpoint: string, options: RequestInit = {}) {
  if (!CL_DATA_API_KEY) {
    throw new Error('CL_DATA_API_KEY is not configured');
  }

  const url = `${CL_DATA_API_BASE_URL}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${CL_DATA_API_KEY}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`CL Data API error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

/**
 * Get level gen sheets from the CL Data API
 */
export async function getLevelGenSheets() {
  try {
    const data = await clDataApiRequest('/api/levels/sheets');
    return data;
  } catch (error) {
    console.error('Error fetching level gen sheets:', error);
    throw error;
  }
}

/**
 * Get production audio directories from the CL Data API
 */
export async function getProductionAudioDirectories() {
  try {
    const data = await clDataApiRequest('/api/drive/audio/production');
    return data;
  } catch (error) {
    console.error('Error fetching production audio directories:', error);
    throw error;
  }
}

/**
 * List contents of a directory by folder ID
 */
export async function listDirectoryContents(folderId: string) {
  try {
    const data = await clDataApiRequest(`/api/drive/list?folder_id=${encodeURIComponent(folderId)}`);
    return data;
  } catch (error) {
    console.error('Error fetching directory contents:', error);
    throw error;
  }
}

/**
 * Upload files to a directory
 * Note: This function expects File objects from the FormData in the API route
 */
export async function uploadFiles(folderId: string, files: File[]) {
  if (!CL_DATA_API_KEY) {
    throw new Error('CL_DATA_API_KEY is not configured');
  }

  const url = `${CL_DATA_API_BASE_URL}/api/drive/upload`;
  
  // Create FormData for multipart/form-data upload
  const formData = new FormData();
  formData.append('folder_id', folderId);
  
  files.forEach(file => {
    formData.append('files', file);
  });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${CL_DATA_API_KEY}`,
      // Don't set Content-Type header - let fetch set it with boundary for multipart/form-data
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`CL Data API error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

/**
 * Type definitions for CL Data API responses
 */
export interface LevelGenSheet {
  id: string;
  name: string;
  type: string;
  mimeType: string;
  modifiedTime: string;
  canOpen: boolean;
}

export interface LevelGenSheetsResponse {
  success: boolean;
  sheets: LevelGenSheet[];
  count: number;
}

export interface DriveItem {
  id: string;
  name: string;
  type: 'file' | 'directory';
  mimeType: string;
  modifiedTime: string;
  size?: string;
  canOpen: boolean;
}

export interface DriveListResponse {
  success: boolean;
  folder_id: string;
  items: DriveItem[];
  count: number;
}

export interface AudioCheckResponse {
  success: boolean;
  total_targets: number;
  available: Array<{
    target: string;
    filename: string;
    file_id: string;
  }>;
  missing: string[];
  available_count: number;
  missing_count: number;
  total_drive_files_count: number;
  folder_file_counts: Record<string, number>;
  checked_folders: string[];
  langname: string;
}

export interface S3TestResponse {
  success: boolean;
  connected: boolean;
  config: {
    AWS_ACCESS_KEY_ID: string;
    AWS_REGION: string;
    AWS_SECRET_ACCESS_KEY: string;
    S3_DEV_BUCKET: string;
    S3_PROD_BUCKET: string;
  };
  tests: {
    list_buckets: {
      success: boolean;
      buckets_found: string[];
      error: string | null;
    };
  };
}

export interface S3FolderExistsResponse {
  success: boolean;
  exists: boolean;
  folder_name: string;
  folder_path: string;
  bucket_type: string;
  bucket_name?: string;
  s3_uri?: string;
  object_count?: number;
  sample_objects?: string[];
}

export interface SyncJobStartResponse {
  success: boolean;
  job_id: string;
  message: string;
  status_url: string;
}

export interface JobStatus {
  job_id: string;
  status: 'queued' | 'running' | 'completed' | 'completed_with_errors' | 'failed';
  progress: number;
  step: string;
  result: any;
  error: string | null;
  created_at: string;
  updated_at: string;
}

export interface JobStatusResponse {
  success: boolean;
  job: JobStatus;
}

/**
 * Test S3 connection
 */
export async function testS3Connection() {
  try {
    const data = await clDataApiRequest('/api/s3/test');
    return data;
  } catch (error) {
    console.error('Error testing S3 connection:', error);
    throw error;
  }
}

/**
 * Check if folder exists in S3
 */
export async function checkS3FolderExists(folderName: string, bucketType: 'dev' | 'prod' = 'dev'): Promise<S3FolderExistsResponse> {
  try {
    const data = await clDataApiRequest('/api/s3/folder/exists', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        folder_name: folderName,
        bucket_type: bucketType,
      }),
    });
    return data;
  } catch (error) {
    console.error('Error checking S3 folder existence:', error);
    throw error;
  }
}

/**
 * Start sync job to S3
 */
export async function startSyncToS3(params: {
  language_code: string;
  sheet_id: string;
  audio_folder_ids: string[];
  confirmation_on_overwrite: 0 | 1;
  bucket_type?: 'dev' | 'prod';
}): Promise<SyncJobStartResponse> {
  try {
    const data = await clDataApiRequest('/api/jobs/sync-to-s3', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        language_code: params.language_code,
        sheet_id: params.sheet_id,
        audio_folder_ids: params.audio_folder_ids,
        confirmation_on_overwrite: params.confirmation_on_overwrite,
        bucket_type: params.bucket_type || 'dev',
      }),
    });
    return data;
  } catch (error) {
    console.error('Error starting sync job:', error);
    throw error;
  }
}

/**
 * Copy dev to prod job
 */
export async function copyDevToProd(params: {
  language_code: string;
  confirmation_on_overwrite: 0 | 1;
}): Promise<SyncJobStartResponse> {
  try {
    const data = await clDataApiRequest('/api/jobs/copy-dev-to-prod', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        language_code: params.language_code,
        confirmation_on_overwrite: params.confirmation_on_overwrite,
      }),
    });
    return data;
  } catch (error) {
    console.error('Error starting copy dev to prod job:', error);
    throw error;
  }
}

/**
 * Get job status
 */
export async function getJobStatus(jobId: string): Promise<JobStatusResponse> {
  try {
    const data = await clDataApiRequest(`/api/jobs/${jobId}/status`);
    return data;
  } catch (error) {
    console.error('Error getting job status:', error);
    throw error;
  }
}

/**
 * Check audio files for a sheet
 */
export async function checkAudioFiles(sheetId: string, audioFolderIds: string | string[]) {
  try {
    const data = await clDataApiRequest('/api/audio/check', {
      method: 'POST',
      body: JSON.stringify({
        sheet_id: sheetId,
        audio_folder_ids: audioFolderIds,
      }),
    });
    return data;
  } catch (error) {
    console.error('Error checking audio files:', error);
    throw error;
  }
}

