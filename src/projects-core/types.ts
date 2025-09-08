/**
 * Project registry types
 */

import { ValidatedRepositoryPath } from '../pure-core/types';

export interface ProjectEntry {
  name: string;
  path: ValidatedRepositoryPath;
  remoteUrl?: string;
  registeredAt: string;
}

export interface ProjectRegistryData {
  version: string;
  projects: ProjectEntry[];
}
