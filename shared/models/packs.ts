export interface ResourcePack {
  id: string;
  name: string;
  fileName: string;
  filePath: string;
  description?: string;
  packFormat?: number;
  enabled: boolean;
  fileSize: number;
  isDirectory: boolean;
}

export interface ShaderPack {
  id: string;
  name: string;
  fileName: string;
  filePath: string;
  description?: string;
  enabled: boolean;
  fileSize: number;
  isDirectory: boolean;
}
