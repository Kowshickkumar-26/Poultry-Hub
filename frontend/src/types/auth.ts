export const Role = {
  CEO: "CEO",
  FARMER: "FARMER",
} as const;

export type Role = (typeof Role)[keyof typeof Role];

export interface User {
  userId: number;
  name: string;
  email: string;
  role: Role;
  phone?: string;
  createdAt?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  role: typeof Role.FARMER;
  phone?: string;
}

export interface AuthResponse {
  token: string;
  userId: number;
  name: string;
  email: string;
  phone?: string;
  role: Role;
}

export interface UserProfile {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role: Role;
  isActive: boolean;
  createdAt?: string;
}

