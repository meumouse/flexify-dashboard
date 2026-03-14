/**
 * Generic search function
 *
 * Returns true if params are matched
 *
 * @param {String} search
 * @param {Array} params
 */
export const inSearch = (search, ...params) => {
  if (!search) return true;
  const lowerCaseSearch = search.toLowerCase();
  for (let param of params) {
    if (!param) continue;
    const lowerCaseParam = param.toLowerCase();
    if (lowerCaseParam.includes(lowerCaseSearch)) {
      return true;
    }
  }
};
