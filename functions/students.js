const functions = require("firebase-functions");
const admin = require("./firebaseAdmin");
const validations = require("./utils/validations");

exports.getStudentById = functions.https.onCall((data, context) => {
  const {studentId} = data;

  return admin.firestore().collection("students").doc(studentId).get()
      .then((doc) => {
        if (!doc.exists) {
          throw new functions.https
              .HttpsError("not-found", "Student not found");
        }
        return {studentDetails: doc.data()};
      })
      .catch((error) => {
        throw new functions.https
            .HttpsError("unknown", error.message, error);
      });
});

exports.getStudentAlerts = functions.https.onCall((data, context) => {
  if (!context.auth) {
    throw new functions.https
        .HttpsError("unauthenticated",
            "User must be authenticated to get student alerts.");
  }

  const {studentId} = data;

  return admin.firestore().collection("students").doc(studentId).get()
      .then((doc) => {
        if (!doc.exists) {
          throw new functions.https
              .HttpsError("not-found", "Student not found");
        }
        const studentData = doc.data();
        return {alerts: studentData.alerts || []};
      })
      .catch((error) => {
        throw new functions.https.HttpsError("unknown", error.message, error);
      });
});

exports.addAlertToStudent = functions.https.onCall((data, context) => {
  if (!context.auth) {
    throw new functions.https
        .HttpsError("unauthenticated",
            "User must be authenticated to add alerts.");
  }

  const {studentId, alertMessage} = data;

  const studentRef = admin.firestore().collection("students").doc(studentId);

  return studentRef.update({
    alerts: admin.firestore.FieldValue.arrayUnion({
      message: alertMessage,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    }),
  })
      .then(() => ({result: `Alert added to student ${studentId}`}))
      .catch((error) => {
        throw new functions.https.HttpsError("unknown", error.message, error);
      });
});

exports.setStudentStatus = functions.https.onRequest((req, res) => {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  const {classId, studentId, ok, statusNote} = req.body;

  if (!classId || !studentId || ok === undefined) {
    return res.status(400).send("classId, studentId, and ok are required.");
  }

  console.log(`Received request to set student
   ${studentId} status to OK = ${ok}`);

  const studentDocRef = admin.firestore().collection("classes")
      .doc(classId).collection("students").doc(studentId);

  return studentDocRef.get()
      .then((doc) => {
        if (!doc.exists) {
          console.error("Student not found");
          return res.status(404).send("Student not found");
        }

        const updates = {ok};

        if (statusNote) {
          const noteRef = studentDocRef.collection("Notes").doc();
          updates.statusNote = {
            note: statusNote,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
          };
          noteRef.set(updates.statusNote);
        }

        return studentDocRef.update({ok})
            .then(() => {
              console.log(`Successfully updated 
                student ${studentId} to OK = ${ok}`);
              return res.status(200).json({
                result: `Student ${studentId} set to OK = ${ok}`,
                statusNote: statusNote || null,
              });
            });
      })
      .catch((error) => {
        console.error("Error setting student status:", error);
        return res.status(500).send(error.message);
      });
});

exports.disconnectClass = functions.https.onRequest((req, res) => {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  const {classId, disconnectId, studentId} = req.body;

  if (!classId || !disconnectId || !studentId) {
    return res.status(400)
        .send("classId, disconnectId, and studentId are required.");
  }

  const classRef = admin.firestore().collection("classes").doc(classId);
  const studentRef = classRef.collection("students").doc(studentId);

  return classRef.get()
      .then((classDoc) => {
        if (!classDoc.exists) {
          return res.status(200)
              .json({success: false, message: "Class not found"});
        }

        const classData = classDoc.data();
        if (classData.disconnectId !== disconnectId) {
          return res.status(200)
              .json({success: false, message: "Invalid disconnectId"});
        }

        return studentRef.get()
            .then((studentDoc) => {
              if (!studentDoc.exists) {
                return res.status(200)
                    .json({success: false, message: "Student not found"});
              }

              return studentRef.update({
                "Finished test": true,
              })
                  .then(() => {
                    return res.status(200).json({success: true});
                  });
            });
      })
      .catch((error) => {
        console.error("Error disconnecting student from class:", error);
        return res.status(500)
            .send("Failed to disconnect student from class.");
      });
});

exports.getConnectedStudents = functions.https.onRequest((req, res) => {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  const {teacherId, classId} = req.body;

  if (!teacherId || !classId) {
    return res.status(400).send("teacherId and classId are required.");
  }

  if (!validations.verifyTeacherId(teacherId)) {
    return res.status(400).send("Invalid teacherId.");
  }

  const classRef = admin.firestore().collection("classes").doc(classId);

  return classRef.get()
      .then((classDoc) => {
        if (!classDoc.exists) {
          return res.status(404).send("Class not found.");
        }

        if (classDoc.data().teacherId !== teacherId) {
          return res.status(403)
              .send("Permission denied. Teacher ID does not match.");
        }

        return classRef.collection("students").get()
            .then((querySnapshot) => {
              const students = [];
              querySnapshot.forEach((doc) => {
                const studentData = doc.data();
                if (studentData["Finished test"] !== true) {
                  students.push({studentId: doc.id, ...studentData});
                }
              });
              return res.status(200).json({students});
            });
      })
      .catch((error) => {
        console.error("Error getting connected students:", error);
        return res.status(500).send("Failed to get connected students.");
      });
});
