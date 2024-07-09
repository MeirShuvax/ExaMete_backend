/**
 * Calculates a checksum based on the provided timestamp and random string.
 *
 * @param {string} timestamp - The timestamp part of the teacher ID.
 * @param {string} random - The random string part of the teacher ID.
 * @return {string} The calculated checksum.
 */
function calculateChecksum(timestamp, random) {
  const sum = (timestamp + random)
      .split("")
      .reduce((acc, char) => acc + parseInt(char, 10), 0);
  return (sum % 100000).toString().padStart(5, "0");
}

/**
 * Verifies the validity of a teacher ID.
 *
 * @param {string} teacherId - The teacher ID to verify.
 * @return {boolean} True if the teacher ID is valid, false otherwise.
 */
function verifyTeacherId(teacherId) {
  if (teacherId.length !== 20) return false;

  const timestamp = teacherId.slice(0, 10);
  const random = teacherId.slice(10, 15);
  const checksum = teacherId.slice(-5);

  const expectedChecksum = calculateChecksum(timestamp, random);
  return checksum === expectedChecksum;
}

module.exports = {
  verifyTeacherId,
};
