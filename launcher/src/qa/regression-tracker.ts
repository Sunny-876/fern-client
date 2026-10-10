export type DefectSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type DefectCategory =
  | 'INSTALLATION'
  | 'LAUNCH_FAILURE'
  | 'PERFORMANCE'
  | 'MOD_COMPATIBILITY'
  | 'UI_CUSTOMIZATION'
  | 'AUTHENTICATION'
  | 'CLOUD_SYNC'
  | 'SECURITY'
  | 'UPDATER';

export interface DefectReport {
  id: string;
  title: string;
  fernVersion: string;
  releaseChannel: 'stable' | 'beta';
  minecraftVersion: string;
  javaRuntime: string;
  loader: string;
  loaderVersion?: string;
  category: DefectCategory;
  severity: DefectSeverity;
  reproductionSteps: string[];
  expectedResult: string;
  actualResult: string;
  sanitizedLogs: string;
  introducedInCommitOrRelease?: string;
  createdAt: number;
  status: 'OPEN' | 'INVESTIGATING' | 'FIXED' | 'DUPLICATE' | 'WONT_FIX';
  assignedTo?: string;
  linkedFix?: string;
  regressionTest?: string;
  duplicateOf?: string;
}

export interface PromotionGateStatus {
  canPromoteToStable: boolean;
  blockingReasons: string[];
  metrics: {
    criticalDefects: number;
    highDefects: number;
    totalOpenDefects: number;
  };
}

/**
 * Sanitizes system logs to strip Windows usernames, IP addresses, tokens, and passwords.
 */
export function sanitizeLogContent(rawLog: string): string {
  let clean = rawLog;

  // 1. Strip Windows User profile directory paths
  clean = clean.replace(/([a-zA-Z]:\\Users\\)[^\\]+/gi, '$1%USERPROFILE%');
  clean = clean.replace(/(\/home\/)[^\/]+/gi, '$1%USER%');

  // 2. Redact sensitive tokens and passwords
  clean = clean.replace(
    /(accessToken|refreshToken|clientToken|password|secret|fern_token)=([^\s,&]+)/gi,
    '$1=[REDACTED]'
  );
  clean = clean.replace(
    /("accessToken"|"refreshToken"|"password"|"secret"):\s*"[^"]+"/gi,
    '$1: "[REDACTED]"'
  );

  // 3. Redact IPv4 addresses in server connections (preserve 127.0.0.1 and localhost)
  clean = clean.replace(
    /\b(?!127\.0\.0\.1\b)(?!0\.0\.0\.0\b)(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g,
    '[REDACTED_IP]'
  );

  return clean;
}

export class RegressionTracker {
  private defects: Map<string, DefectReport> = new Map();

  public submitReport(
    params: Omit<DefectReport, 'id' | 'createdAt' | 'status' | 'sanitizedLogs'> & { rawLogs: string }
  ): DefectReport {
    const id = `defect-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const sanitizedLogs = sanitizeLogContent(params.rawLogs);

    const defect: DefectReport = {
      ...params,
      id,
      sanitizedLogs,
      createdAt: Date.now(),
      status: 'OPEN',
    };

    this.defects.set(id, defect);
    return defect;
  }

  public getDefects(): DefectReport[] {
    return Array.from(this.defects.values());
  }

  public getDefect(id: string): DefectReport | undefined {
    return this.defects.get(id);
  }

  public updateStatus(id: string, status: DefectReport['status']): void {
    const d = this.defects.get(id);
    if (d) d.status = status;
  }

  public assignOwner(id: string, owner: string): boolean {
    const d = this.defects.get(id);
    if (!d) return false;
    d.assignedTo = owner;
    if (d.status === 'OPEN') {
      d.status = 'INVESTIGATING';
    }
    return true;
  }

  public linkFix(id: string, fixCommitOrPr: string, regressionTestName?: string): boolean {
    const d = this.defects.get(id);
    if (!d) return false;
    d.linkedFix = fixCommitOrPr;
    if (regressionTestName) {
      d.regressionTest = regressionTestName;
    }
    d.status = 'FIXED';
    return true;
  }

  public markDuplicate(id: string, canonicalId: string): boolean {
    const d = this.defects.get(id);
    if (!d) return false;
    d.status = 'DUPLICATE';
    d.duplicateOf = canonicalId;
    return true;
  }

  public getMetrics(): {
    total: number;
    open: number;
    investigating: number;
    fixed: number;
    duplicate: number;
    critical: number;
    high: number;
  } {
    const all = Array.from(this.defects.values());
    return {
      total: all.length,
      open: all.filter((d) => d.status === 'OPEN').length,
      investigating: all.filter((d) => d.status === 'INVESTIGATING').length,
      fixed: all.filter((d) => d.status === 'FIXED').length,
      duplicate: all.filter((d) => d.status === 'DUPLICATE').length,
      critical: all.filter((d) => d.severity === 'CRITICAL' && (d.status === 'OPEN' || d.status === 'INVESTIGATING')).length,
      high: all.filter((d) => d.severity === 'HIGH' && (d.status === 'OPEN' || d.status === 'INVESTIGATING')).length,
    };
  }

  /**
   * Identifies duplicates by comparing category, loader, minecraftVersion, and error signature.
   */
  public findDuplicate(candidate: DefectReport): DefectReport | null {
    for (const existing of this.defects.values()) {
      if (existing.id === candidate.id) continue;
      if (
        existing.category === candidate.category &&
        existing.minecraftVersion === candidate.minecraftVersion &&
        existing.loader === candidate.loader &&
        existing.title.toLowerCase().trim() === candidate.title.toLowerCase().trim()
      ) {
        return existing;
      }
    }
    return null;
  }

  /**
   * Evaluates whether the current beta build can be promoted to stable.
   * Criteria:
   * - 0 Critical defects
   * - < 2 High defects
   * - 0 unresolved Security defects
   */
  public evaluatePromotionGate(): PromotionGateStatus {
    const openDefects = Array.from(this.defects.values()).filter(
      (d) => d.status === 'OPEN' || d.status === 'INVESTIGATING'
    );

    const criticalCount = openDefects.filter((d) => d.severity === 'CRITICAL').length;
    const highCount = openDefects.filter((d) => d.severity === 'HIGH').length;
    const securityCount = openDefects.filter((d) => d.category === 'SECURITY').length;

    const blockingReasons: string[] = [];

    if (criticalCount > 0) {
      blockingReasons.push(`Blocking: Found ${criticalCount} unresolved CRITICAL defect(s).`);
    }
    if (highCount >= 2) {
      blockingReasons.push(`Blocking: Found ${highCount} unresolved HIGH defect(s) (maximum allowed: 1).`);
    }
    if (securityCount > 0) {
      blockingReasons.push(`Blocking: Found ${securityCount} unresolved SECURITY defect(s).`);
    }

    return {
      canPromoteToStable: blockingReasons.length === 0,
      blockingReasons,
      metrics: {
        criticalDefects: criticalCount,
        highDefects: highCount,
        totalOpenDefects: openDefects.length,
      },
    };
  }
}
