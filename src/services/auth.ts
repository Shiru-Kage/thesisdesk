import { UserAccount, UserRole } from '../types/defense';
import { registerOrUpdateUser } from './firebase';

export interface AuthCredentials {
  email: string;
  password: string;
  role?: UserRole;
}

export interface AuthResult {
  success: boolean;
  user?: UserAccount;
  errorMessage?: string;
}

// Credentials loaded dynamically from environment variables
const ENV_STUDENT_EMAIL = (import.meta.env.VITE_STUDENT_EMAIL || 'imppcabalag@gmail.com').trim().toLowerCase();
const ENV_STUDENT_PASS = String(import.meta.env.VITE_STUDENT_PASSWORD || '12345').trim();

const ENV_ADMIN_EMAIL = (import.meta.env.VITE_ADMIN_EMAIL || 'pvcabalag@mapua.edu.ph').trim().toLowerCase();
const ENV_ADMIN_PASS = String(import.meta.env.VITE_ADMIN_PASSWORD || '12345').trim();

export function getDefaultEmailForRole(role: UserRole): string {
  return role === 'student' ? ENV_STUDENT_EMAIL : ENV_ADMIN_EMAIL;
}

export function getDefaultPasswordForRole(role: UserRole): string {
  return role === 'student' ? ENV_STUDENT_PASS : ENV_ADMIN_PASS;
}

export function createDefaultAccount(role: UserRole, emailOverride?: string): UserAccount {
  const email = (emailOverride || (role === 'student' ? ENV_STUDENT_EMAIL : ENV_ADMIN_EMAIL)).trim();
  if (role === 'student') {
    return {
      id: 'usr-stu-default',
      name: 'Student Candidate',
      email,
      role: 'student',
      department: 'Information Technology',
      studentId: '',
      program: 'B.S. Information Technology · Mapúa UOx',
      avatarUrl: '', // Default profile picture removed
    };
  }

  return {
    id: 'usr-adm-default',
    name: 'SOIT Thesis Coordinator',
    email,
    role: 'admin',
    department: 'School of Information Technology · UOx',
    avatarUrl: '', // Default profile picture removed
  };
}

export function authenticateUser(
  creds: AuthCredentials,
  registeredUsers: UserAccount[] = []
): AuthResult {
  const email = creds.email.trim().toLowerCase();
  const password = creds.password.trim();

  // 1. Verify against student credentials from environment
  if (email === ENV_STUDENT_EMAIL) {
    if (password === ENV_STUDENT_PASS) {
      const existing = registeredUsers.find((u) => u.email.toLowerCase() === email);
      const user = existing || createDefaultAccount('student', email);
      registerOrUpdateUser(user).catch(() => {});
      return { success: true, user };
    }
    return { success: false, errorMessage: 'Incorrect password for this student account.' };
  }

  // 2. Verify against admin credentials from environment
  if (email === ENV_ADMIN_EMAIL) {
    if (password === ENV_ADMIN_PASS) {
      const existing = registeredUsers.find((u) => u.email.toLowerCase() === email);
      const user = existing || createDefaultAccount('admin', email);
      registerOrUpdateUser(user).catch(() => {});
      return { success: true, user };
    }
    return { success: false, errorMessage: 'Incorrect password for this administrator account.' };
  }

  // 3. Verify against any user created via the registration form
  const matchedUser = registeredUsers.find((u) => u.email.toLowerCase() === email);
  if (matchedUser) {
    return { success: true, user: matchedUser };
  }

  return {
    success: false,
    errorMessage: 'No account found matching this institutional email. Please check your spelling or register a new account.',
  };
}
