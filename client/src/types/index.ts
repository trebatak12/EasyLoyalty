export interface User {
  id: string;
  email: string;
  name: string;
  status: "active" | "blocked";
  lastLoginAt?: string;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: "manager" | "staff";
  status: "active" | "blocked";
  lastLoginAt?: string;
}

export interface Wallet {
  id: string;
  userId: string;
  balanceCents: number;
  bonusGrantedTotalCents: number;
  lastActivityAt?: string;
}

export interface Transaction {
  id: string;
  userId: string;
  type: "topup" | "charge" | "void" | "adjustment";
  amountCents: number;
  relatedId?: string;
  idempotencyKey?: string;
  createdBy: "user" | "admin" | "system";
  meta: Record<string, any>;
  createdAt: string;
}

export interface QRCodeData {
  qrPayload: string;
  shortCode: string;
  expiresAt: string;
}

export interface ChargeInitResponse {
  userId: string;
  customerName: string;
  balanceCZK: string;
  balanceCents: number;
  chargeId: string;
}

export interface ChargeConfirmResponse {
  newBalanceCZK: string;
  newBalanceCents: number;
}

export interface CustomerSummary {
  id: string;
  name: string;
  email: string;
  balanceCZK: string;
  balanceCents: number;
  bonusGrantedTotalCZK: string;
  bonusGrantedTotalCents: number;
  lastActivity?: string;
}

export interface AdminSummary {
  membersCount: number;
  liabilityCZK: string;
  liabilityCents: number;
  bonusGrantedTotalCZK: string;
  bonusGrantedTotalCents: number;
  spendTodayCZK: string;
  spendTodayCents: number;
  spendWeekCZK: string;
  spendWeekCents: number;
}

export interface ApiError {
  error: string;
  message: string;
  code: string;
  details?: any;
}

export type PackageCode = "MINI" | "STANDARD" | "MAXI" | "ULTRA";

export interface TopUpPackage {
  code: PackageCode;
  name: string;
  pay: number;
  bonus: number;
  total: number;
  percentage: string;
  popular?: boolean;
}
