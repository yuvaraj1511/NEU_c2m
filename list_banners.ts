
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function listBanners() {
  try {
    const snapshot = await getDocs(collection(db, 'banners'));
    console.log('Banners in DB:');
    snapshot.docs.forEach(doc => {
      console.log(`ID: ${doc.id}, Data:`, doc.data());
    });
    process.exit(0);
  } catch (error) {
    console.error('Error listing banners:', error);
    process.exit(1);
  }
}

listBanners();
