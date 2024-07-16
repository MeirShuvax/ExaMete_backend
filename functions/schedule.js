const functions = require("firebase-functions");
const admin = require("./firebaseAdmin");
const teacher = require("./teacher");

/**
 * Scheduled function to clean up classes 24 hours after the test ends.
 * This function runs every 5 minutes.
 */
//* *******************************************************
//                    scheduled Class Cleanup
//* *******************************************************
exports.scheduledClassCleanup = functions.pubsub
    .schedule("every 24 hours").onRun(async (context) => {
      const now = new Date();
      const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      console.log("Current time:", now);
      console.log("Cutoff time:", cutoff);

      const classesRef = admin.firestore().collection("classes");
      const snapshot = await classesRef.get();

      const deletePromises = [];

      snapshot.forEach((doc) => {
        const classData = doc.data();
        const [testYear, testMonth, testDay] = classData.testDate.split("-");
        const [testHour, testMinute] = classData.testStartTime.split(":");

        const testStartDateTime = new Date(testYear,
            testMonth - 1, testDay, testHour, testMinute);
        const testEndDateTime = new Date(testStartDateTime.getTime() +
                classData.testTimeHours * 60 * 60 * 1000 +
                classData.testTimeMinutes * 60 * 1000);

        console.log(`Class ID: ${doc.id}`);
        console.log(`Test start time: ${testStartDateTime}`);
        console.log(`Test end time: ${testEndDateTime}`);

        if (testEndDateTime <= cutoff) {
          console.log(`Deleting class: ${doc.id}`);
          deletePromises.push(callDeleteClassFunction(doc.id,
              classData.teacherId));
        }
      });

      await Promise.all(deletePromises);
    });

//* *******************************************************
//                    call Delete Class Function
//* *******************************************************
/**
 * Helper function to call deleteClass.
 *
 * @param {string} classId - The ID of the class to be deleted.
 * @param {string} teacherId - The ID of the teacher associated with the class.
 */
async function callDeleteClassFunction(classId, teacherId) {
  const req = {
    method: "POST",
    body: {classId, teacherId},
  };
  const res = {
    status: (code) => ({
      send: (message) => { },
      json: (message) => { },
    }),
    send: (message) => { },
  };

  await teacher.deleteClass(req, res);
}
