/**
 * Encodes a string to hash
 *
 * Primarily used for email hashing to send to gravatar
 *
 * @param {string} message
 */
export const encodeToHash = async (message) => {
  if (!message) return message;

  // Encode the string into bytes
  const msgBuffer = new TextEncoder().encode(message);

  // Hash the message
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);

  // Convert the ArrayBuffer to hex string
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

  return hashHex;
};
