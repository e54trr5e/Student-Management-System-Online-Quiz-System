const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  rollNo: { type: String, required: true },
  name: { type: String, required: true },
  email: { type: String },
  phone: String,
  department: String,
  year: Number,
  gpa: Number,
  dob: String,
  address: String,
}, { timestamps: true });

module.exports = mongoose.model('Student', studentSchema);