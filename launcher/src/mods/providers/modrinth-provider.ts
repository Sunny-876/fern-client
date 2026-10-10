import { IModProvider } from './provider-interface';
import {
  ModSearchOptions,
  ModSearchResult,
  ModSearchResultItem,
  ModVersionDetails,
  ModDependency,
} from '../../../../shared/models/mod';
import { FernLogger } from '../../core/logger';
import { DownloadManager } from '../../downloads/download-manager';

export class ModrinthProvider implements IModProvider {
  public readonly id = 'modrinth';
  public readonly name = 'Modrinth';

  private readonly baseUrl = 'https://api.modrinth.com/v2';
  private readonly userAgent = 'FernClient/1.0.0 (contact@fernclient.net)';

  constructor(
    private logger: FernLogger,
    private downloadManager: DownloadManager
  ) {}

  public async search(options: ModSearchOptions): Promise<ModSearchResult> {
    const facets: string[][] = [['project_type:mod']];

    if (options.minecraftVersion) {
      facets.push([`versions:${options.minecraftVersion}`]);
    }
    if (options.loader && options.loader !== 'vanilla') {
      facets.push([`categories:${options.loader}`]);
    }
    if (options.category) {
      facets.push([`categories:${options.category}`]);
    }

    const queryParams = new URLSearchParams();
    if (options.query) {
      queryParams.set('query', options.query);
    }
    queryParams.set('facets', JSON.stringify(facets));
    queryParams.set('limit', String(options.limit || 20));
    queryParams.set('offset', String(options.offset || 0));

    if (options.sortBy) {
      queryParams.set('index', options.sortBy);
    } else {
      queryParams.set('index', 'downloads');
    }

    const url = `${this.baseUrl}/search?${queryParams.toString()}`;

    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': this.userAgent },
      });

      if (!res.ok) {
        throw new Error(`Modrinth search failed with HTTP ${res.status}`);
      }

      const data = await res.json() as any;
      const items: ModSearchResultItem[] = (data.hits || []).map((hit: any) => ({
        id: hit.project_id || hit.slug,
        slug: hit.slug,
        name: hit.title,
        summary: hit.description || '',
        author: hit.author,
        iconUrl: hit.icon_url,
        downloads: hit.downloads || 0,
        follows: hit.follows || 0,
        categories: hit.categories || [],
        loaders: hit.loaders || [],
        gameVersions: hit.game_versions || [],
        dateUpdated: hit.date_modified || hit.date_created,
      }));

      return {
        totalHits: data.total_hits || 0,
        items,
        offset: data.offset || 0,
        limit: data.limit || 20,
      };
    } catch (err) {
      this.logger.error('ModrinthProvider', 'Search error:', err);
      return { totalHits: 0, items: [], offset: 0, limit: 20 };
    }
  }

  public async getProject(projectId: string): Promise<ModSearchResultItem> {
    const url = `${this.baseUrl}/project/${encodeURIComponent(projectId)}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': this.userAgent },
    });
    if (!res.ok) {
      throw new Error(`Failed to fetch Modrinth project ${projectId}: HTTP ${res.status}`);
    }
    const data = await res.json() as any;

    return {
      id: data.id,
      slug: data.slug,
      name: data.title,
      summary: data.description,
      author: data.team,
      iconUrl: data.icon_url,
      downloads: data.downloads || 0,
      follows: data.followers || 0,
      categories: data.categories || [],
      loaders: data.loaders || [],
      gameVersions: data.game_versions || [],
      dateUpdated: data.updated || data.published,
    };
  }

  public async getVersions(
    projectId: string,
    minecraftVersion?: string,
    loader?: string
  ): Promise<ModVersionDetails[]> {
    const params = new URLSearchParams();
    if (minecraftVersion) {
      params.set('game_versions', JSON.stringify([minecraftVersion]));
    }
    if (loader && loader !== 'vanilla') {
      params.set('loaders', JSON.stringify([loader]));
    }

    const url = `${this.baseUrl}/project/${encodeURIComponent(projectId)}/version?${params.toString()}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': this.userAgent },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch versions for project ${projectId}: HTTP ${res.status}`);
    }

    const data = await res.json() as any[];
    return data.map((v: any) => ({
      id: v.id,
      projectId: v.project_id,
      name: v.name,
      versionNumber: v.version_number,
      gameVersions: v.game_versions || [],
      loaders: v.loaders || [],
      files: (v.files || []).map((f: any) => ({
        url: f.url,
        filename: f.filename,
        primary: f.primary ?? true,
        size: f.size,
        sha1: f.hashes?.sha1,
        sha512: f.hashes?.sha512,
      })),
      dependencies: (v.dependencies || []).map((d: any) => ({
        projectId: d.project_id,
        versionId: d.version_id,
        dependencyType: d.dependency_type || 'required',
      })),
    }));
  }

  public async getDependencies(versionId: string): Promise<ModDependency[]> {
    const url = `${this.baseUrl}/version/${encodeURIComponent(versionId)}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': this.userAgent },
    });
    if (!res.ok) {
      return [];
    }

    const data = await res.json() as any;
    const deps: ModDependency[] = [];

    for (const d of data.dependencies || []) {
      if (d.project_id) {
        deps.push({
          id: d.project_id,
          type: d.dependency_type || 'required',
          name: d.project_id,
        });
      }
    }

    return deps;
  }

  public async download(fileUrl: string, destinationPath: string, expectedSha1?: string): Promise<void> {
    await this.downloadManager.downloadBatch(
      `mod-download-${Date.now()}`,
      [
        {
          id: fileUrl,
          url: fileUrl,
          destination: destinationPath,
          expectedSha1,
          category: 'mod',
        },
      ],
      { stepName: 'Downloading mod' }
    );
  }
}
