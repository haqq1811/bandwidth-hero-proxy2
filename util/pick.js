// Since only single function required from lodash or underscore, writing it self

// Picks specific properties from an object
module.exports = (object, properties) => {
  const picked = {};
  if (!object) return picked;
  // Loop over the few wanted keys instead of every key on the object
  for (const key of properties) {
    if (Object.prototype.hasOwnProperty.call(object, key)) {
      picked[key] = object[key];
    }
  }
  return picked;
};
