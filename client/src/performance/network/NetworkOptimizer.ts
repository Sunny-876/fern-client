export interface NetworkOptimizationConfig {
  tcpNoDelay: boolean;
  chunkPacketBatching: boolean;
  maxPendingChunks: number;
}

export class NetworkOptimizer {
  private config: NetworkOptimizationConfig = {
    tcpNoDelay: true,
    chunkPacketBatching: true,
    maxPendingChunks: 64,
  };

  constructor(config?: Partial<NetworkOptimizationConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }

  public getConfig(): Readonly<NetworkOptimizationConfig> {
    return { ...this.config };
  }

  public isTcpNoDelayEnabled(): boolean {
    return this.config.tcpNoDelay;
  }
}
