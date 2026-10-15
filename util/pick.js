// Returns a new object with only the given keys that exist on `object`.
module.exports = (object, keys) => {
  const picked = {};
  if (!object) return picked;
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(object, key)) picked[key] = object[key];
  }
  return picked;
};
