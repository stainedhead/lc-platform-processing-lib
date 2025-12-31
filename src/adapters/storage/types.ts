/**
 * Storage Adapter Types
 */

/**
 * Storage configuration for adapters
 */
export interface StorageConfig {
  /** Cloud provider (for future use) */
  provider?: string;
  /** Region (for future use) */
  region?: string;
  /** Additional configuration */
  [key: string]: unknown;
}
