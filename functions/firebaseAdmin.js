const admin = require("firebase-admin");

if (!admin.apps.length) {
  const config = {
    storageBucket: "exammate-6aebc.appspot.com",
  };

  admin.initializeApp(config);
}

module.exports = admin;
