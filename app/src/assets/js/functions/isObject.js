/**
 * Checks whether given value is object
 *
 * @param {mixed} variable
 * @returns {boolean}
 */
export const isObject = (variable) => {
  return typeof variable === "object" && variable !== null && !Array.isArray(variable);
};
