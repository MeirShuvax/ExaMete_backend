const admin = require("../firebaseAdmin");

exports.getClassById = async (classId) => {
  const classRef = admin.firestore().collection("classes").doc(classId);
  const classDoc = await classRef.get();
  return {classRef, classDoc};
};

exports.verifyTeacher = (classDoc, teacherId) => {
  if (!classDoc.exists) {
    throw new Error("Class not found");
  }

  if (classDoc.data().teacherId !== teacherId) {
    throw new Error("Permission denied. Teacher ID does not match.");
  }
};
