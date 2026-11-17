import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { initializeFirestore, getFirestore, persistentLocalCache, persistentMultipleTabManager, Firestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

const databaseId = (firebaseConfig as any).firestoreDatabaseId;

// Initialize Firestore targeting the provisioned database ID with safe fallback
let dbInstance: Firestore;
try {
  dbInstance = initializeFirestore(
    app,
    {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
      })
    },
    databaseId
  );
} catch (err) {
  console.warn('Persistent Firestore cache unavailable, using default instance:', err);
  dbInstance = getFirestore(app, databaseId);
}

export const db = dbInstance;

export const googleProvider = new GoogleAuthProvider();

// Connection test
async function testConnection() {
  try {
    // Try to fetch a non-existent doc from server to test connectivity
    // Using getDocFromServer ensures we are actually hitting the backend
    await getDocFromServer(doc(db, '_internal_', 'connection_test'));
    console.log("Firestore connection verified.");
  } catch (error: any) {
    if (error?.code === 'unavailable' || error?.message?.includes('offline')) {
      console.warn("Firestore is currently running offline or is unavailable. Local cache will be used.");
    } else if (error?.code === 'permission-denied') {
      console.log("Firestore connection verified (Permission denied is expected for internal test path).");
    } else {
      console.error("Firestore connection error:", error);
    }
  }
}
testConnection();
