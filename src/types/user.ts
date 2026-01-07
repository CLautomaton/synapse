import { Timestamp } from 'firebase-admin/firestore';

/**
 * User document stored in Firestore 'users' collection
 * The document ID is the Firebase UID
 */
export interface User {
  /** Firebase UID - used as the document ID in Firestore */
  uid: string;
  /** User's email address */
  email: string;
  /** User's first name */
  name: string;
  /** User's last name */
  surname: string;
  /** User's role ID */
  roleID: string;
  /** Map of project access IDs, where keys are numeric strings and values are arrays of access strings */
  projectAccessIDs: Record<string, string[]>;
  /** Timestamp when the user was created (Firestore Timestamp or Date when serialized) */
  createDate: Timestamp | Date;
}

/**
 * User data without the UID (for creating/updating documents)
 * The UID is stored as the document ID, not in the document data
 */
export interface UserData {
  email: string;
  name: string;
  surname: string;
  roleID: string;
  projectAccessIDs: Record<string, string[]>;
  createDate: Timestamp | Date;
}

/**
 * User data for creating a new user (createDate will be set server-side)
 */
export interface CreateUserData {
  email: string;
  name: string;
  surname: string;
  roleID: string;
  projectAccessIDs?: Record<string, string[]>;
}

