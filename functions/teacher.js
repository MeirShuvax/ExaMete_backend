const functions = require("firebase-functions");
const admin = require("./firebaseAdmin");
const {deleteFilesInFolder} = require("./utils/storage");
const validations = require("./utils/validations");


//* *******************************************************
//                    delete Class
//* *******************************************************
exports.deleteClass = functions.https.onRequest(async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  const {teacherId, classId} = req.body;

  if (!teacherId || !classId) {
    return res.status(400).send("teacherId and classId are required.");
  }

  const classRef = admin.firestore().collection("classes").doc(classId);

  try {
    const doc = await classRef.get();
    if (!doc.exists) {
      return res.status(404).send("Class not found.");
    }

    if (doc.data().teacherId !== teacherId) {
      return res.status(403)
          .send("Permission denied. Teacher ID does not match.");
    }

    await deleteFilesInFolder(`pdfs/${classId}/`);
    await classRef.delete();

    return res.status(200)
        .json("Class deleted successfully, including storage files.");
  } catch (error) {
    console.error("Error deleting class:", error);
    return res.status(500).send("Failed to delete class.");
  }
});

//* *******************************************************
//                   delete Classes By Teacher
//* *******************************************************

exports.deleteClassesByTeacher = functions.https
    .onRequest(async (req, res) => {
      if (req.method !== "POST") {
        return res.status(405).send("Method Not Allowed");
      }

      const {teacherId} = req.body;

      if (!teacherId) {
        return res.status(400).send("teacherId is required.");
      }

      const classesRef = admin.firestore().collection("classes");

      try {
        const snapshot = await classesRef
            .where("teacherId", "==", teacherId).get();
        if (snapshot.empty) {
          return res.status(404)
              .send("No classes found for the given teacherId.");
        }

        const deletePromises = snapshot.docs.map((doc) => {
          const classId = doc.id;
          return exports.deleteClass({
            body: {teacherId, classId},
            method: "POST",
          }, {
            status: () => ({
              send: (message) => console.log(`Delete response: ${message}`),
              json: (message) => console.log(`Delete response: ${message}`),
            }),
          });
        });

        await Promise.all(deletePromises);

        return res.status(200).json("All classes deleted successfully.");
      } catch (error) {
        console.error("Error deleting classes by teacher:", error);
        return res.status(500).send("Failed to delete classes by teacher.");
      }
    });

//* *******************************************************
//                    get Classes By Id
//* *******************************************************

exports.getClassesById = functions.https.onRequest((req, res) => {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  const {teacherId} = req.body;

  if (!teacherId) {
    return res.status(400).send("teacherId is required.");
  }

  // Verify the teacher ID
  if (!validations.verifyTeacherId(teacherId)) {
    return res.status(400).send("Invalid teacherId.");
  }

  // Get classes by teacher ID
  admin.firestore().collection("classes")
      .where("teacherId", "==", teacherId)
      .get()
      .then((querySnapshot) => {
        const classes = [];
        querySnapshot.forEach((doc) => {
          classes.push({classId: doc.id, ...doc.data()});
        });
        return res.status(200).json({classes});
      })
      .catch((error) => {
        console.error("Error getting classes:", error);
        return res.status(500).send(error.message);
      });
});


//* *******************************************************
//                    get New Updates
//* *******************************************************
exports.getNewUpdates = functions.https.onRequest((req, res) => {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  const {teacherId, classId} = req.body;

  if (!teacherId || !classId) {
    return res.status(400).send("teacherId and classId are required.");
  }

  // Verify the teacher ID
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
            .then(async (studentsSnapshot) => {
              const updates = [];

              const updatePromises = studentsSnapshot
                  .docs.map(async (studentDoc) => {
                    const studentData = studentDoc.data();
                    const notesSnapshot = await studentDoc.ref
                        .collection("Notes")
                        .orderBy("timestamp", "desc")
                        .get();

                    notesSnapshot.forEach((noteDoc) => {
                      const noteData = noteDoc.data();
                      if (noteData.updatedToTeacher != true) {
                        updates.push({
                          studentId: studentDoc.id,
                          studentDetails: studentData,
                          note: noteData,
                        });
                        // Update the note to mark it as updated to the teacher
                        noteDoc.ref.update({updatedToTeacher: true});
                      }
                    });
                  });

              await Promise.all(updatePromises);

              updates.sort((a, b) => b.note.timestamp
                  .toDate() - a.note.timestamp.toDate());

              return res.status(200).json({updates});
            });
      })
      .catch((error) => {
        console.error("Error getting new updates:", error);
        return res.status(500).send("Failed to get new updates.");
      });
});
//* *******************************************************
//* *******************************************************
