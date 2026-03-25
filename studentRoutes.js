const express = require('express');
const router = express.Router();
const Student = require('../models/Student');

// GET all students
router.get('/', async (req, res) => {
  try {
    const students = await Student.find().sort({ createdAt: -1 });
    res.json(students);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// ADD student
router.post('/', async (req, res) => {
  try {
    const { name, rollNo, email, phone, department, year, gpa } = req.body;

    if (!name || !rollNo) {
      return res.status(400).json({ error: "Name and Roll No required" });
    }

    const student = new Student({
      name,
      rollNo,
      email,
      phone,
      department,
      year,
      gpa
    });

    const saved = await student.save();
    res.status(201).json(saved);

  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// UPDATE student
router.put('/:id', async (req, res) => {
  try {
    const updated = await Student.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ error: "Student not found" });
    }

    res.json(updated);

  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// DELETE student
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Student.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return res.status(404).json({ error: "Student not found" });
    }

    res.json({ message: "Deleted successfully" });

  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;