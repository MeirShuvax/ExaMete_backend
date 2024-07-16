const functions = require("firebase-functions");
const admin = require("./firebaseAdmin");
const validations = require("./utils/validations");
// const students = require("./students");


// const {deleteFilesInFolder} = require("./utils/storage");


//* *************************************************
//                    create New Class
//* *************************************************
const {v4: uuidv4} = require("uuid");

exports.createNewClass = functions.https.onRequest((req, res) => {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  const {
    name,
    openMaterial,
    testDate,
    testStartTime,
    testTimeHours,
    testTimeMinutes,
    teacherId,
  } = req.body;

  if (
    !name ||
    typeof openMaterial !== "boolean" ||
    !testDate ||
    !testStartTime ||
    typeof testTimeHours !== "number" ||
    typeof testTimeMinutes !== "number" ||
    !teacherId
  ) {
    return res.status(400).send("All fields are required.");
  }

  if (!validations.verifyTeacherId(teacherId)) {
    return res.status(400).send("Invalid teacherId.");
  }

  const disconnectId = uuidv4();

  const newClass = {
    name,
    openMaterial,
    testDate,
    testStartTime,
    testTimeHours,
    testTimeMinutes,
    teacherId,
    disconnectId,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  admin.firestore().collection("classes").add(newClass)
      .then((docRef) => {
        return res.status(200).json({
          classId: docRef.id,
          disconnectId: disconnectId,
        });
      })
      .catch((error) => {
        console.error("Error adding document:", error);
        return res.status(500).send(error.message);
      });
});

//* *************************************************
//                    join Class
//* *************************************************
exports.joinClass = functions.https.onRequest((req, res) => {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  const {classId, firstName, lastName, email} = req.body;

  if (!classId || !firstName || !lastName || !email) {
    return res.status(400)
        .send("classId, firstName, lastName, and email are required.");
  }

  const classRef = admin.firestore().collection("classes").doc(classId);
  const studentsCollectionRef = classRef.collection("students");

  return classRef.get()
      .then((classDoc) => {
        if (!classDoc.exists) {
          return res.status(200).json({success: false});
        }

        const classData = classDoc.data();
        delete classData.teacherId;
        delete classData.disconnectId;

        const newStudent = {
          firstName,
          lastName,
          email,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        return studentsCollectionRef.add(newStudent)
            .then((studentDocRef) => {
              return res.status(200).json({
                studentId: studentDocRef.id,
                success: true,
                classDetails: classData,
              });
            });
      })
      .catch((error) => {
        console.error("Error joining class:", error);
        return res.status(500).send({success: false, error: error.message});
      });
});

//* *************************************************
//                    get Class Details
//* *************************************************

exports.getClassDetails = functions.https.onRequest((req, res) => {
  if (req.method !== "GET") {
    return res.status(405).send("Method Not Allowed");
  }

  const {classId} = req.query;

  if (!classId) {
    return res.status(400).send("classId is required.");
  }

  return admin.firestore().collection("classes").doc(classId).get()
      .then((doc) => {
        if (!doc.exists) {
          return res.status(404).send("Class not found");
        }
        return res.status(200).json({classDetails: doc.data()});
      })
      .catch((error) => {
        console.error("Error getting class details:", error);
        return res.status(500).send(error.message);
      });
});

//* *************************************************
//                    get Class Comments
//* *************************************************
exports.getClassComments = functions.https.onRequest(async (req, res) => {
  const {classId} = req.body;

  if (!classId) {
    return res.status(400).send("classId is required.");
  }

  try {
    const studentsSnapshot = await admin.firestore()
        .collection("classes")
        .doc(classId)
        .collection("students")
        .get();

    if (studentsSnapshot.empty) {
      return res.status(404).send("No students found in the specified class.");
    }

    const comments = [];

    const studentsPromises = studentsSnapshot.docs.map(async (studentDoc) => {
      const studentData = studentDoc.data();
      const studentId = studentDoc.id;

      const notesSnapshot = await studentDoc.ref.collection("Notes")
          .orderBy("timestamp", "desc").get();

      notesSnapshot.forEach((noteDoc) => {
        comments.push({
          studentId: studentId,
          studentDetails: studentData,
          note: noteDoc.data(),
        });
      });
    });

    await Promise.all(studentsPromises);

    comments.sort((a, b) => b.note
        .timestamp.toDate() - a.note.timestamp.toDate());

    return res.status(200).json(comments);
  } catch (error) {
    console.error("Error retrieving class comments:", error);
    return res.status(500).send(error.message);
  }
});

//* *************************************************
//                    edit Class
//* *************************************************
exports.editClass = functions.https.onRequest((req, res) => {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  const {
    teacherId,
    classId,
    name,
    openMaterial,
    testDate,
    testStartTime,
    testTimeHours,
    testTimeMinutes,
  } = req.body;

  if (!teacherId || !classId) {
    return res.status(400).send("teacherId and classId are required.");
  }

  if (!name || typeof openMaterial !== "boolean" || !testDate ||
    !testStartTime || typeof testTimeHours !== "number" ||
    typeof testTimeMinutes !== "number") {
    return res.status(400).send("All fields are required for updating.");
  }

  if (!validations.verifyTeacherId(teacherId)) {
    return res.status(400).send("Invalid teacherId.");
  }

  const classRef = admin.firestore()
      .collection("classes").doc(classId);

  return classRef.get()
      .then((doc) => {
        if (!doc.exists) {
          return res.status(404).send("Class not found.");
        }

        if (doc.data().teacherId !== teacherId) {
          return res.status(403)
              .send("Permission denied. Teacher ID does not match.");
        }

        const updatedClass = {
          name,
          openMaterial,
          testDate,
          testStartTime,
          testTimeHours,
          testTimeMinutes,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        return classRef.update(updatedClass)
            .then(() => {
              return classRef.get();
            })
            .then((updatedDoc) => {
              return res.status(200).json({
                message: "Class updated successfully.",
                classDetails: updatedDoc.data(),
              });
            });
      })
      .catch((error) => {
        console.error("Error updating class:", error);
        return res.status(500).send("Failed to update class.");
      });
});

//* *************************************************
//                    convertAaToBb
//* *************************************************
exports.convertAaToBb = functions.https.onRequest((req, res) => {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  const {aa} = req.body;

  if (!aa) {
    return res.status(400).send("Field \"aa\" is required.");
  }

  const result = {bb: aa};

  return res.status(200).json(result);
});

//* *************************************************
//                    upload Class Document
//* *************************************************

const Busboy = require("busboy");
const {log} = require("console");
const cors = require("cors")({origin: true});

exports.uploadClassDocument = functions.https.onRequest((req, res) => {
  cors(req, res, () => {
    if (req.method !== "POST") {
      return res.status(405).end("Method Not Allowed");
    }

    const busboy = new Busboy({headers: req.headers});
    const tmpdir = require("os").tmpdir();
    const uploads = {};
    let classId = null;

    busboy.on("field", (fieldname, val) => {
      console.log(`Processed field ${fieldname}: ${val}.`);
      if (fieldname === "classId") {
        classId = val;
      }
    });

    busboy.on("file", (fieldname, file, filename, encoding, mimetype) => {
      const filepath = require("path").join(tmpdir, filename);
      const writeStream = require("fs").createWriteStream(filepath);
      file.pipe(writeStream);

      uploads[fieldname] = {filepath, mimetype};
      file.on("end", () => {
        console.log(`File ${filename} finished downloading.`);
      });
    });

    busboy.on("finish", () => {
      const promises = [];
      for (const [fieldname, {filepath, mimetype}] of Object.entries(uploads)) {
        const bucket = admin.storage().bucket();
        const destination = `uploads/${classId}/${require("path")
            .basename(filepath)}`;
        log.console("fieldname");
        fieldname.
            promises.push(
                bucket.upload(filepath, {
                  destination,
                  metadata: {contentType: mimetype},
                })
                    .then(() => require("fs").unlinkSync(filepath))
                    .catch((error) => {
                      console.error("Failed to upload", error);
                      throw new Error("Failed to upload");
                    }),
            );
      }

      Promise.all(promises)
          .then(() => res.status(200).send("File uploaded successfully."))
          .catch((error) => res.status(500).send("Error uploading files."));
    });

    req.pipe(busboy);
  });
});

//* *************************************************

