/**
 * Project registry types
 */

import { AlexandriaEntry } from '../pure-core/types/repository';

export interface ProjectRegistryData {
  version: string;
  projects: AlexandriaEntry[];
}
