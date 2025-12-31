/**
 * Domain Types for Platform Configuration Processing Library
 *
 * This file contains core type definitions used across the domain layer.
 * All types here are pure TypeScript with NO external dependencies.
 */

/**
 * Result type for type-safe error handling
 * Discriminated union that forces handling of both success and error cases
 */
export type Result<T, E> = { success: true; value: T } | { success: false; error: E };

/**
 * Configuration Error Types
 * Errors related to configuration management operations
 */
export enum ConfigurationError {
  AlreadyExists = 'CONFIGURATION_ALREADY_EXISTS',
  NotFound = 'CONFIGURATION_NOT_FOUND',
  ValidationFailed = 'CONFIGURATION_VALIDATION_FAILED',
  StorageError = 'CONFIGURATION_STORAGE_ERROR',
  InvalidFormat = 'CONFIGURATION_INVALID_FORMAT',
}

/**
 * Validation Error Types
 * Errors related to validation operations
 */
export enum ValidationError {
  InvalidFormat = 'VALIDATION_INVALID_FORMAT',
  InvalidValue = 'VALIDATION_INVALID_VALUE',
  MissingRequired = 'VALIDATION_MISSING_REQUIRED',
  TagCollision = 'VALIDATION_TAG_COLLISION',
  DependencyInvalid = 'VALIDATION_DEPENDENCY_INVALID',
}

/**
 * Storage Error Types
 * Errors related to storage operations
 */
export enum StorageError {
  ReadFailed = 'STORAGE_READ_FAILED',
  WriteFailed = 'STORAGE_WRITE_FAILED',
  DeleteFailed = 'STORAGE_DELETE_FAILED',
  NotFound = 'STORAGE_NOT_FOUND',
  PermissionDenied = 'STORAGE_PERMISSION_DENIED',
  UploadFailed = 'STORAGE_UPLOAD_FAILED',
  PartialUpload = 'STORAGE_PARTIAL_UPLOAD',
}

/**
 * Deployment Error Types
 * Errors related to deployment operations
 */
export enum DeploymentError {
  ArtifactNotCached = 'DEPLOYMENT_ARTIFACT_NOT_CACHED',
  DependenciesNotDeployed = 'DEPLOYMENT_DEPENDENCIES_NOT_DEPLOYED',
  DeploymentFailed = 'DEPLOYMENT_FAILED',
  RollbackFailed = 'DEPLOYMENT_ROLLBACK_FAILED',
  InvalidEnvironment = 'DEPLOYMENT_INVALID_ENVIRONMENT',
  PolicyNotGenerated = 'DEPLOYMENT_POLICY_NOT_GENERATED',
}

/**
 * Standard Tags Interface
 * Required tags for all deployed resources
 */
export interface StandardTags {
  /** Cloud account identifier */
  account: string;
  /** Team name */
  team: string;
  /** Application moniker */
  moniker: string;
  /** Version number (optional for application-level resources) */
  version?: string;
  /** Deployment environment (optional for version-specific resources) */
  environment?: string;
  /** User or system that created the resource */
  createdBy: string;
  /** ISO 8601 timestamp of creation */
  createdAt: string;
  /** Platform identifier (always 'lc-platform') */
  managedBy: 'lc-platform';
}

/**
 * Tag Validation Rules
 * Constraints for tag keys and values
 */
export const TAG_VALIDATION_RULES = {
  /** Maximum number of tags (standard + custom) */
  MAX_TOTAL_TAGS: 50,
  /** Maximum length for tag keys */
  MAX_KEY_LENGTH: 128,
  /** Maximum length for tag values */
  MAX_VALUE_LENGTH: 256,
  /** Pattern for valid tag keys (alphanumeric + hyphens/underscores) */
  KEY_PATTERN: /^[a-zA-Z0-9_-]+$/,
  /** Pattern for valid tag values (alphanumeric + hyphens/underscores/spaces) */
  VALUE_PATTERN: /^[a-zA-Z0-9_\s-]+$/,
} as const;

/**
 * Application Metadata
 * Optional descriptive data for applications
 */
export interface ApplicationMetadata {
  displayName?: string;
  description?: string;
  owner?: string;
  tags?: Record<string, string>;
}

/**
 * Version Metadata
 * Optional descriptive data for versions
 */
export interface VersionMetadata {
  releaseNotes?: string;
  buildNumber?: string;
  commitSha?: string;
  tags?: Record<string, string>;
}
