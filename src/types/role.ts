/**
 * Role document stored in Firestore 'roles' collection
 * The document ID is the roleID (e.g., "0", "1", "2", "3")
 */
export interface Role {
  /** Role ID - used as the document ID in Firestore */
  roleID: string;
  /** Display name of the role */
  name: string;
}

/**
 * Role data stored in Firestore (without roleID, since it's the document ID)
 */
export interface RoleData {
  /** Display name of the role */
  name: string;
}

/**
 * List of roles
 */
export type RolesList = Role[];

