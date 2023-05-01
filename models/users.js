const mongoose = require('mongoose');
const usersSchema = new mongoose.Schema({
  username: String,
  password: String,
  email: String,
  type: String,
});

const usersModel = mongoose.model('users', usersSchema);

module.exports = usersModel;