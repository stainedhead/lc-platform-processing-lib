/**
 * Configuration Loader
 *
 * Loads library configuration (if needed for library defaults)
 * Currently minimal as library is consumed by applications
 */

export interface LibraryConfig {
  /** Default managed-by tag value */
  readonly managedByTag: 'lc-platform';
  /** Default timeout for storage operations (ms) */
  readonly storageTimeout: number;
  /** Default timeout for deployment operations (ms) */
  readonly deploymentTimeout: number;
}

/**
 * Default library configuration
 */
export const DEFAULT_CONFIG: LibraryConfig = {
  managedByTag: 'lc-platform',
  storageTimeout: 30000, // 30 seconds
  deploymentTimeout: 600000, // 10 minutes
};

/**
 * Load library configuration
 * Currently returns defaults, can be extended to read from environment or config files
 */
export function loadConfig(): LibraryConfig {
  return DEFAULT_CONFIG;
}
