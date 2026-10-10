import {
  ModSearchOptions,
  ModSearchResult,
  ModSearchResultItem,
  ModVersionDetails,
  ModDependency,
} from '../../../../shared/models/mod';

export interface IModProvider {
  readonly id: string;
  readonly name: string;

  /**
   * Searches the provider mod catalog with optional filtering.
   */
  search(options: ModSearchOptions): Promise<ModSearchResult>;

  /**
   * Retrieves full details for a single project/mod.
   */
  getProject(projectId: string): Promise<ModSearchResultItem>;

  /**
   * Retrieves available versions for a mod, optionally filtered by MC version and loader.
   */
  getVersions(
    projectId: string,
    minecraftVersion?: string,
    loader?: string
  ): Promise<ModVersionDetails[]>;

  /**
   * Downloads a specific file from the provider to destination.
   */
  download(fileUrl: string, destinationPath: string, expectedSha1?: string): Promise<void>;

  /**
   * Resolves dependencies for a specific version.
   */
  getDependencies(versionId: string): Promise<ModDependency[]>;
}
