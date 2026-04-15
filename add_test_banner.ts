
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function addBanner() {
  try {
    // Adding a vertical image URL to demonstrate the automatic "zoom and fit" (object-cover)
    // and to show that the system handles any ratio.
    await addDoc(collection(db, 'banners'), {
      imageUrl: 'https://images.unsplash.com/photo-1635405074683-96d6921a2a2c?w=1600&q=80',
      createdAt: serverTimestamp()
    });
    console.log('Vertical banner added successfully to test auto-crop');
    process.exit(0);
  } catch (error) {
    console.error('Error adding banner:', error);
    process.exit(1);
  }
}

addBanner();
