/**
 * App document stored in Firestore 'apps' collection
 * The document ID is the app ID (e.g., "0", "1", "2")
 */
export interface App {
  /** App ID - used as the document ID in Firestore */
  appID: string;
  /** Display name of the app */
  name: string;
  /** Development base URL */
  devBaseURL: string;
  /** Production base URL */
  prodBaseURL: string;
}

/**
 * App data stored in Firestore (without appID, since it's the document ID)
 */
export interface AppData {
  /** Display name of the app */
  name: string;
  /** Development base URL */
  devBaseURL: string;
  /** Production base URL */
  prodBaseURL: string;
}

/**
 * List of apps
 */
export type AppsList = App[];

