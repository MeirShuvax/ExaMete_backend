// const functions = require("firebase-functions");
// const admin = require("firebase-admin");


const functions = require("firebase-functions");
const admin = require("./firebaseAdmin");

exports.addHelloWorld = functions.https.onRequest((req, res) => {
  const defaultMessage = {
    text: "Hello world",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  admin.firestore().collection("messages").add(defaultMessage)
      .then((writeResult) => {
        res.status(200).send(`Document added with ID: ${writeResult.id}`);
      })
      .catch((error) => {
        console.error("Error adding document: ", error);
        res.status(500).send("Error adding document");
      });
});

exports.addData = functions.https.onRequest((req, res) => {
  if (req.method !== "POST") {
    res.status(405).send("Method Not Allowed");
    return;
  }

  const {text} = req.body;

  admin.firestore().collection("messages").add({
    text,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  })
      .then((writeResult) => {
        res.status(200).send({message: `Message with ID:
         ${writeResult.id} added.`});
      })
      .catch((error) => {
        res.status(500).send({error: error.message});
      });
});

exports.getData = functions.https.onRequest((req, res) => {
  admin.firestore().collection("messages").get()
      .then((querySnapshot) => {
        const messages = [];
        querySnapshot.forEach((doc) => {
          messages.push(doc.data());
        });
        res.status(200).json({messages});
      })
      .catch((error) => {
        res.status(500).send({error: error.message});
      });
});
