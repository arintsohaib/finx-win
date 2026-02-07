/**
 * ⚠️ DEPRECATED - AWS S3 / Cloudflare R2 Configuration
 * 
 * This file is no longer used. The application has been migrated to use
 * local file storage instead of cloud storage.
 * 
 * See: lib/local-storage.ts for the new implementation
 * 
 * Migration Date: October 30, 2025
 */

export interface BucketConfig {
  bucketName: string;
  folderPrefix: string;
  region: string;
  isR2?: boolean;
  publicUrl?: string;
}

/**
 * @deprecated Use local storage instead (lib/local-storage.ts)
 */
export function getBucketConfig(): BucketConfig {
  console.warn('⚠️  [AWS] getBucketConfig is deprecated. Use local storage instead.');
  
  return {
    bucketName: 'deprecated',
    folderPrefix: '',
    region: 'us-east-1',
  };
}

/**
 * @deprecated Use local storage instead (lib/local-storage.ts)
 */
export function createS3Client(): any {
  console.warn('⚠️  [AWS] createS3Client is deprecated. Use local storage instead.');
  return null;
}
