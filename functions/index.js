// const functions = require("firebase-functions");
require("./firebaseAdmin");

// const messages = require("./messages");
const classes = require("./classes");
const students = require("./students");
const teacher = require("./teacher");
const validations = require("./utils/validations");
const schedule = require("./schedule");


// Import functions
//* *************************************************
// exports.addHelloWorld = messages.addHelloWorld;
// exports.addData = messages.addData;
// exports.getData = messages.getData;

//* *************************************************
//                    classes
//* *************************************************
exports.createNewClass = classes.createNewClass;
exports.joinClass = classes.joinClass;
exports.getClassDetails = classes.getClassDetails;
exports.editClass = classes.editClass;
exports.uploadClassDocument = classes.uploadClassDocument;
// exports.abc = classes.abc;

//* *************************************************
//                    students
//* *************************************************
exports.getStudentById = students.getStudentById;
exports.getStudentAlerts = students.getStudentAlerts;
exports.addAlertToStudent = students.addAlertToStudent;
exports.setStudentStatus = students.setStudentStatus;
exports.disconnectClass = students.disconnectClass;
exports.getConnectedStudents = students.getConnectedStudents;

//* *************************************************
//                    validations
//* *************************************************
exports.verifyTeacherId = validations.verifyTeacherId;

//* *************************************************
//                    teacher
//* *************************************************
exports.deleteClass = teacher.deleteClass;
exports.getClassesById = teacher.getClassesById;
exports.getMyClasses = teacher.getMyClasses;
exports.deleteClassesByTeacher = teacher.deleteClassesByTeacher;
exports.getNewUpdates = teacher.getNewUpdates;

//* *************************************************
//                    Scheduled
//* *************************************************
exports.scheduledClassCleanup = schedule.scheduledClassCleanup;


