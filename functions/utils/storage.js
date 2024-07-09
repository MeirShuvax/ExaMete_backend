const admin = require("../firebaseAdmin");

/**
 * Deletes all files in the specified folder in Firebase Storage.
 *
 * @param {string} prefix - The prefix of the folder in Firebase Storage.
 * @return {Promise<void>} A promise that resolves when all files are deleted.
 */
async function deleteFilesInFolder(prefix) {
  const bucket = admin.storage().bucket();
  const [files] = await bucket.getFiles({prefix});

  const deletePromises = files.map((file) => file.delete());
  await Promise.all(deletePromises);
}

module.exports = {
  deleteFilesInFolder,
};
