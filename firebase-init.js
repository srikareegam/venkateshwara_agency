/* ============================= FIREBASE CONFIG =============================
   PASTE YOUR OWN VALUES BELOW (from Firebase Console > Project settings > General
   > Your apps > SDK setup and configuration > Config radio button). Also set the
   two real email addresses you create as Owner / Supervisor in Firebase Auth.
============================================================================= */
const firebaseConfig = {
  apiKey: "AIzaSyDyuXwyXKtGaa93voUI6pYQ0PKVGBkHTj8",
  authDomain: "venkateshwaraagency-58ad6.firebaseapp.com",
  projectId: "venkateshwaraagency-58ad6",
  storageBucket: "venkateshwaraagency-58ad6.firebasestorage.app",
  messagingSenderId: "150440209378",
  appId: "1:150440209378:web:55e52f29d95934c9fc27bb"
};
const OWNER_EMAIL = "eegamsrikar157@gmail.com";      // must match an account you create in Firebase Auth
const SUPERVISOR_EMAIL = "supervisor@example.com";  // must match an account you create in Firebase Auth
/* ========================================================================= */

const CONFIG_IS_PLACEHOLDER = firebaseConfig.apiKey.includes('PASTE_YOUR');
let auth = null, db = null;
if(!CONFIG_IS_PLACEHOLDER){
  firebase.initializeApp(firebaseConfig);
  auth = firebase.auth();
  db = firebase.firestore();
}

function waitForAuthUser(){
  return new Promise((resolve) => {
    if(!auth){ resolve(null); return; }
    const unsub = auth.onAuthStateChanged((user) => { unsub(); resolve(user); });
  });
}

async function sget(key){
  try{
    const doc = await db.collection('venk_data').doc(key).get();
    if(!doc.exists) return null;
    const data = doc.data();
    return (data && data.value !== undefined) ? JSON.parse(data.value) : null;
  }catch(e){ console.error('Firestore get failed', key, e); return null; }
}
async function sset(key, value){
  try{
    await db.collection('venk_data').doc(key).set({ value: JSON.stringify(value), updatedAt: Date.now() });
    return true;
  }catch(e){ console.error('Firestore set failed', key, e); return false; }
}
