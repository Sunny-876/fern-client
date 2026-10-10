export type LaunchStage =
  | 'idle'
  | 'validating_account'
  | 'validating_installation'
  | 'validating_java'
  | 'preparing_directories'
  | 'preparing_libraries'
  | 'preparing_assets'
  | 'building_arguments'
  | 'spawning_process'
  | 'running'
  | 'exited'
  | 'error';

export interface LaunchStatusUpdate {
  stage: LaunchStage;
  message: string;
  percentage: number;
  pid?: number;
  error?: string;
  crashAnalysis?: {
    hasCrash: boolean;
    possibleCause: string;
    suggestedAction: string;
    crashReportPath?: string;
    summary?: string;
    suspectedCause?: string;
  };
}

export interface LaunchConfiguration {
  accountId: string;
  installationId: string;
  profileId?: string;
  dryRun?: boolean;
  safeMode?: boolean;
  offlineMode?: boolean;
}

export interface LaunchResult {
  success: boolean;
  pid?: number;
  command?: string;
  args?: string[];
  workingDirectory?: string;
  error?: string;
}
