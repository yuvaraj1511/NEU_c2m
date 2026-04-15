
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function cleanupBanners() {
  try {
    const snapshot = await getDocs(collection(db, 'banners'));
    console.log('Cleaning up banners...');
    for (const document of snapshot.docs) {
      const data = document.data();
      // Delete banners that have Base64 in videoUrl (buggy data)
      if (data.videoUrl && data.videoUrl.startsWith('data:')) {
        console.log(`Deleting buggy banner ID: ${document.id}`);
        await deleteDoc(doc(db, 'banners', document.id));
      }
    }
    console.log('Cleanup complete.');
    process.exit(0);
  } catch (error) {
    console.error('Error cleaning up banners:', error);
    process.exit(1);
  }
}

cleanupBanners();
