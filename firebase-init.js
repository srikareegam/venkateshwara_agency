/* ============================= FIREBASE CONFIG =============================
   PASTE YOUR OWN VALUES BELOW (from Firebase Console > Project settings > General
   > Your apps > SDK setup and configuration > Config radio button).

   TWO-TIER AUTH MODEL
   --------------------
   Owner signs in with a real Firebase Auth account (OWNER_EMAIL below) — set
   its password directly in Firebase Authentication, same as before.

   Supervisors do NOT get individual Firebase Auth accounts. Instead, each
   supervisor has an app-managed username/password stored in Firestore
   (managed from the "Supervisors" page, visible/editable by Owner at any
   time — something Firebase Auth itself can never do, since it never
   exposes stored passwords back to anyone, not even admins).

   To let a supervisor's browser still read/write Firestore, the app signs
   into ONE shared *technical* Firebase Auth account behind the scenes
   (SUPERVISOR_POOL_EMAIL / SUPERVISOR_POOL_PASSWORD below) whenever someone
   logs in with a valid supervisor username+password. This pool account is
   never shown to or typed by an actual supervisor — create it once in
   Firebase Authentication and set its password here.

   SECURITY NOTE: SUPERVISOR_POOL_PASSWORD lives in this client-side file, so
   anyone who can read the app's source could sign into the pool account and
   query Firestore directly, bypassing the app's per-supervisor permission
   checks (those checks are enforced in the UI layer here, not by Firestore
   security rules). This is the same class of exposure the app already had
   with a single hardcoded supervisor account — just noting it explicitly.
============================================================================= */
const firebaseConfig = {
  apiKey: "AIzaSyDyuXwyXKtGaa93voUI6pYQ0PKVGBkHTj8",
  authDomain: "venkateshwaraagency-58ad6.firebaseapp.com",
  projectId: "venkateshwaraagency-58ad6",
  storageBucket: "venkateshwaraagency-58ad6.firebasestorage.app",
  messagingSenderId: "150440209378",
  appId: "1:150440209378:web:55e52f29d95934c9fc27bb"
};
const OWNER_EMAIL = "eegamsrikar157@gmail.com";              // must match an account you create in Firebase Auth
const SUPERVISOR_POOL_EMAIL = "eegamsrikar@gmail.com";       // technical account, must exist in Firebase Auth
const SUPERVISOR_POOL_PASSWORD = "CHANGE_ME_POOL_PASSWORD";  // its password — set both here and in Firebase Auth
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
