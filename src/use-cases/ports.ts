/**
 * Port Interfaces for Use Cases Layer
 *
 * These interfaces define the contracts for external dependencies.
 * Adapters in the adapter layer implement these ports using actual infrastructure.
 */

import type { Result } from '../domain/types';
import type { StorageError, DeploymentError } from '../domain/types';

/**
 * Dependency Configuration
 * Generic structure for infrastructure dependencies
 */
export interface DependencyConfiguration {
  type: string; // e.g., 'database', 'queue', 'cache', 'storage'
  name: string;
  configuration: Record<string, unknown>;
}

/**
 * Artifact Reference
 * Reference to a cached deployment artifact
 */
export interface ArtifactReference {
  path: string; // Storage path to artifact
  size: number; // Size in bytes
  checksum: string; // SHA-256 hash
  uploadedAt: Date;
}

/**
 * Policy References
 * References to generated IAM policies
 */
export interface PolicyReferences {
  appPolicyPath?: string; // Storage path to app policy JSON
  cicdPolicyPath?: string; // Storage path to CI/CD policy JSON
  generatedAt?: Date;
}

/**
 * Storage Provider Port
 * Abstraction for cloud storage operations
 */
export interface IStorageProvider {
  /**
   * Check if a configuration exists at the given path
   */
  exists(path: string): Promise<boolean>;

  /**
   * Read configuration from storage
   */
  read<T>(path: string): Promise<Result<T, StorageError>>;

  /**
   * Write configuration to storage
   */
  write<T>(path: string, data: T): Promise<Result<void, StorageError>>;

  /**
   * Delete configuration from storage
   */
  delete(path: string): Promise<Result<void, StorageError>>;

  /**
   * Upload artifact to storage
   */
  uploadArtifact(
    path: string,
    stream: ReadableStream | NodeJS.ReadableStream,
    metadata: { size: number; contentType: string }
  ): Promise<Result<ArtifactReference, StorageError>>;

  /**
   * Delete artifact from storage (cleanup on failure)
   */
  deleteArtifact(path: string): Promise<Result<void, StorageError>>;
}

/**
 * Policy Document Structure
 * Cloud-agnostic IAM policy structure
 */
export interface PolicyDocument {
  version: string;
  statements: PolicyStatement[];
}

export interface PolicyStatement {
  effect: 'Allow' | 'Deny';
  actions: string[];
  resources: string[];
  conditions?: Record<string, unknown>;
}

/**
 * Policy Provider Port
 * Abstraction for IAM policy generation
 */
export interface IPolicyProvider {
  /**
   * Generate application runtime policy from dependencies
   */
  generateAppPolicy(
    dependencies: DependencyConfiguration[]
  ): Promise<Result<PolicyDocument, Error>>;

  /**
   * Generate CI/CD deployment policy from dependencies
   */
  generateCICDPolicy(
    dependencies: DependencyConfiguration[]
  ): Promise<Result<PolicyDocument, Error>>;

  /**
   * Serialize policy document to JSON string
   */
  serializePolicy(policy: PolicyDocument): string;
}

/**
 * Deployment Result
 * Information about a completed deployment operation
 */
export interface DeploymentResult {
  deploymentId: string;
  status: 'completed' | 'failed';
  startedAt: Date;
  completedAt: Date;
  duration: number; // milliseconds
  appliedTags: Record<string, string>;
}

/**
 * Deployment Provider Port
 * Abstraction for deployment operations
 */
export interface IDeploymentProvider {
  /**
   * Deploy application with policies and tags
   */
  deployApplication(params: {
    artifactPath: string;
    policyDocument: PolicyDocument;
    environment: string;
    tags: Record<string, string>;
  }): Promise<Result<DeploymentResult, DeploymentError>>;

  /**
   * Deploy a single dependency with tags
   */
  deployDependency(params: {
    dependency: DependencyConfiguration;
    environment: string;
    tags: Record<string, string>;
  }): Promise<Result<DeploymentResult, DeploymentError>>;

  /**
   * Rollback a deployment (cleanup on failure)
   */
  rollbackDeployment(deploymentId: string): Promise<Result<void, DeploymentError>>;
}
