// Enum Definitions
export enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  USER = 'user'
}

export enum CommissionStatus {
  UNPAID = 'unpaid',
  ELIGIBLE = 'eligible',
  PAID = 'paid'
}

// Entity Interfaces
export interface Profile {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  role: UserRole;
  team_id?: string;
  default_commission_rate: number;
}

export interface Team {
  id: string;
  name: string;
  manager_id?: string;
}

export interface CommissionEntry {
  id: string;
  user_id: string;
  invoice_number: string;
  receipt_number?: string; // New field for receipt tracking
  customer: string;
  project: string;
  amount_before_vat: number;
  cost_before_vat: number;
  commission_rate: number;
  tax: number; // For audit
  net_total: number; // Computed
  net_to_pay: number; // Computed
  invoice_month: string; // ISO Date string
  client_paid_date?: string; // ISO Date string
  commission_status: CommissionStatus;
  company_paid_date?: string; // ISO Date string
  note?: string;
  file_name?: string; // Simulating file storage reference
}

export interface UploadItem {
  id: string;
  file: File;
  status: 'uploading' | 'parsing' | 'ready' | 'error';
  progress: number; // 0-100
  extractedData?: any;
  errorMessage?: string;
}

// App State Interfaces
export type ViewState = 'dashboard' | 'commissions' | 'upload' | 'settings' | 'review' | 'admin';

export interface AppState {
  currentUser: Profile | null;
  profiles: Profile[];
  teams: Team[];
  commissions: CommissionEntry[];
  currentView: ViewState;
}