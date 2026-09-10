// Firebase project settings for the Autograph site.
//
// NOTE: these values are NOT secrets. A Firebase web config is designed to ship
// inside the browser bundle — what actually protects the data is the Firestore
// security rules (see firestore.rules in the project root) together with
// Firebase Authentication. Never put an "admin"/service-account key in here.
export const environment = {
  production: false,
  firebase: {
    apiKey: 'AIzaSyBTaAjBVy-mFkqWgYuTB43KkQxFRgd9IzM',
    authDomain: 'autograph-5d956.firebaseapp.com',
    projectId: 'autograph-5d956',
    storageBucket: 'autograph-5d956.firebasestorage.app',
    messagingSenderId: '405240703741',
    appId: '1:405240703741:web:262858bd36bc600583ac94',
    measurementId: 'G-9ZHMXE2DV7'
  }
};
