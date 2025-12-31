/**
 * ResourceTags Value Object
 * Standard tags extraction, custom tag merging, collision detection (FR-035, FR-036)
 */

import { Result, ValidationError } from '../types';

export interface StandardTagsParams {
  account: string;
  team: string;
  moniker: string;
  version: string;
  environment: string;
}

export class ResourceTags {
  private constructor(private readonly tags: Record<string, string>) {}

  static create(params: StandardTagsParams): Result<ResourceTags, ValidationError> {
    // Validate required fields
    if (!params.account || params.account.length === 0) {
      return { success: false, error: ValidationError.MissingRequired };
    }
    if (!params.team || params.team.length === 0) {
      return { success: false, error: ValidationError.MissingRequired };
    }
    if (!params.moniker || params.moniker.length === 0) {
      return { success: false, error: ValidationError.MissingRequired };
    }
    if (!params.version || params.version.length === 0) {
      return { success: false, error: ValidationError.MissingRequired };
    }
    if (!params.environment || params.environment.length === 0) {
      return { success: false, error: ValidationError.MissingRequired };
    }

    // FR-035: Extract standard tags
    const standardTags: Record<string, string> = {
      'lc:account': params.account,
      'lc:team': params.team,
      'lc:application': params.moniker,
      'lc:version': params.version,
      'lc:environment': params.environment,
      'lc:managed-by': 'lc-platform',
    };

    return { success: true, value: new ResourceTags(standardTags) };
  }

  /**
   * FR-036: Merge custom tags with standard tags
   * Detects collisions with lc: prefix and standard tag keys
   */
  withCustomTags(customTags: Record<string, string>): Result<ResourceTags, ValidationError> {
    const mergedTags = { ...this.tags };

    for (const [key, value] of Object.entries(customTags)) {
      // Check for lc: prefix collision (reserved for standard tags)
      if (key.startsWith('lc:')) {
        return { success: false, error: ValidationError.InvalidValue };
      }

      // Check for collision with existing standard tags
      if (key in mergedTags) {
        return { success: false, error: ValidationError.InvalidValue };
      }

      mergedTags[key] = value;
    }

    return { success: true, value: new ResourceTags(mergedTags) };
  }

  toRecord(): Record<string, string> {
    return { ...this.tags };
  }
}
