const functions = require("firebase-functions");
const admin = require("./firebaseAdmin"); // Use the custom firebaseAdmin file

const WebSocket = require("ws");
// const { v4: uuidv4 } = require("uuid");

// admin.initializeApp();
const classClients = {};

// WebSocket server function
exports.websocketServer = functions.https.onRequest((req, res) => {
  const wss = new WebSocket.Server({noServer: true});

  wss.on("connection", (ws, request) => {
    const classId = request.url.split("/")[1];
    if (!classClients[classId]) {
      classClients[classId] = [];
    }
    classClients[classId].push(ws);

    ws.on("message", (message) => {
      console.log(`Received message from class ${classId}:`, message);
    });

    ws.on("close", () => {
      classClients[classId] = classClients[classId]
          .filter((client) => client !== ws);
    });
  });

  const server = req.connection.server;
  server.on("upgrade", (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request);
    });
  });

  res.status(200).send("WebSocket server is running.");
});


exports.notifyTeacherOnStatusChange = functions.firestore
    .document("classes/{classId}/students/{studentId}")
    .onUpdate((change, context) => {
      const classId = context.params.classId;
      const newValue = change.after.data();

      if (newValue.ok === false) {
        if (classClients[classId]) {
          classClients[classId].forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({
                studentId: context.params.studentId,
                status: newValue.ok,
                message: "A student has reported a status of 'not OK'.",
              }));
            }
          });
        }
      }
      admin.firestore().collection("classes").get();


      return null;
    });
