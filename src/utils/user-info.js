const os = require('os');

function getUserName() {
  return os.userInfo().username;
}

module.exports = {
  getUserName
};
