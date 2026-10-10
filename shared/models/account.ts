export type AccountType = 'microsoft' | 'local';

export interface Account {
  id: string;
  displayName: string;
  type: AccountType;
  uuid: string;
  createdAt: number;
  lastUsed: number;
  skinUrl?: string;
  // Tokens are managed securely in Phase 4 via official Microsoft/Xbox authentication flows
  accessToken?: string;
  refreshToken?: string;
}

export interface CreateLocalAccountDTO {
  displayName: string;
}
