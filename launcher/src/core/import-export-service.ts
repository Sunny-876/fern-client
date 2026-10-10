import * as fs from 'fs/promises';
import * as path from 'path';
import { FernPathManager } from './paths';
import { FernLogger } from './logger';
import { InstallationManager } from '../installations/installation-manager';
import { ProfileManager } from '../installations/profile-manager';
import { Installation } from '../../../shared/models/installation';
import { FernProfile } from '../../../shared/models/profile';

export type ExportableType = 'fern_profile' | 'fern_installation' | 'fern_theme' | 'fern_hud_layout';

export interface ExportPackage<T = any> {
  format: 'fern_package';
  type: ExportableType;
  version: string;
  createdAt: number;
  payload: T;
  checksum?: string;
}

export class ImportExportService {
  constructor(
    private pathManager: FernPathManager,
    private logger: FernLogger,
    private installationManager: InstallationManager,
    private profileManager: ProfileManager
  ) {}

  public exportInstallation(installationId: string): ExportPackage<Installation> {
    const inst = this.installationManager.getInstallation(installationId);
    if (!inst) throw new Error(`Installation ${installationId} not found`);

    return {
      format: 'fern_package',
      type: 'fern_installation',
      version: '1.0.0-phase8',
      createdAt: Date.now(),
      payload: inst,
    };
  }

  public exportProfile(profileId: string): ExportPackage<FernProfile> {
    const prof = this.profileManager.getProfile(profileId);
    if (!prof) throw new Error(`Profile ${profileId} not found`);

    return {
      format: 'fern_package',
      type: 'fern_profile',
      version: '1.0.0-phase8',
      createdAt: Date.now(),
      payload: prof,
    };
  }

  /**
   * Validates and imports a JSON export package into the system.
   */
  public async importPackage(rawJson: string): Promise<{ success: boolean; message: string; importedId?: string }> {
    let pkg: ExportPackage;
    try {
      pkg = JSON.parse(rawJson);
    } catch {
      return { success: false, message: 'Invalid JSON file format.' };
    }

    if (pkg.format !== 'fern_package' || !pkg.type || !pkg.payload) {
      return { success: false, message: 'Unrecognized Fern package format.' };
    }

    if (pkg.type === 'fern_installation') {
      const instData: Installation = pkg.payload;
      if (!instData.name || !instData.minecraftVersion) {
        return { success: false, message: 'Malformed installation payload.' };
      }

      // Sanitize name and create imported copy
      const newInst = await this.installationManager.createInstallation({
        name: `${instData.name} (Imported)`,
        minecraftVersion: instData.minecraftVersion,
        loader: instData.loader,
        loaderVersion: instData.loaderVersion,
        memoryAllocation: instData.memoryAllocation,
        launchArguments: instData.launchArguments,
      });

      this.logger.info('ImportExportService', `Imported installation: ${newInst.name}`);
      return { success: true, message: `Successfully imported "${newInst.name}"`, importedId: newInst.id };
    }

    if (pkg.type === 'fern_profile') {
      const profData: FernProfile = pkg.payload;
      if (!profData.name) {
        return { success: false, message: 'Malformed profile payload.' };
      }

      const newProf = await this.profileManager.createProfile({
        name: `${profData.name} (Imported)`,
        installationId: profData.installationId || 'vanilla-latest',
        minecraftVersion: profData.minecraftVersion || '1.21.1',
        ramMb: profData.ramMb || 4096,
        settings: profData.settings || {},
      });

      this.logger.info('ImportExportService', `Imported profile: ${newProf.name}`);
      return { success: true, message: `Successfully imported "${newProf.name}"`, importedId: newProf.id };
    }

    return { success: false, message: `Unsupported package type: ${pkg.type}` };
  }
}
