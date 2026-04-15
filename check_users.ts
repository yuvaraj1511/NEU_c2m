
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function checkUser() {
  try {
    const snapshot = await getDocs(collection(db, 'users'));
    console.log('Users in DB:');
    snapshot.docs.forEach(doc => {
      console.log(`ID: ${doc.id}, Data:`, doc.data());
    });
    process.exit(0);
  } catch (error) {
    console.error('Error checking users:', error);
    process.exit(1);
  }
}

checkUser();
