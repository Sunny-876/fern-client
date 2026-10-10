export interface JavaRuntime {
  id: string;
  name: string;
  path: string;
  version: string;
  versionString?: string;
  majorVersion: number;
  architecture: string;
  vendor: string;
  isDefault: boolean;
  isValid: boolean;
}

export interface JavaDetectionResult {
  runtimes: JavaRuntime[];
  recommendedPath?: string;
  systemPath?: string;
}
