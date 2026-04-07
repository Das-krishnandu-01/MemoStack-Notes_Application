const express = require('express');
const router = express.Router();
const Note = require('../models/Note');
const auth = require('../middleware/authMiddleware');

// @route   GET api/notes
// @desc    Get all user notes
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const notes = await Note.find({ user: req.user.id }).sort({ updated: -1 });
    // Map _id to id for frontend compatibility
    const mappedNotes = notes.map(note => ({
      id: note._id.toString(),
      title: note.title,
      body: note.body,
      color: note.color,
      updated: note.updated
    }));
    res.json(mappedNotes);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/notes
// @desc    Add new note
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    const newNote = new Note({
      ...req.body,
      user: req.user.id
    });
    const note = await newNote.save();
    res.json({
        id: note._id.toString(),
        title: note.title,
        body: note.body,
        color: note.color,
        updated: note.updated
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/notes/:id
// @desc    Update a note
// @access  Private
router.put('/:id', auth, async (req, res) => {
  try {
    let note = await Note.findById(req.params.id);
    if (!note) return res.status(404).json({ message: 'Note not found' });
    
    // Make sure user owns note
    if (note.user.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    note = await Note.findByIdAndUpdate(
      req.params.id,
      { $set: req.body, updated: Date.now() },
      { new: true }
    );
    res.json({
        id: note._id.toString(),
        title: note.title,
        body: note.body,
        color: note.color,
        updated: note.updated
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   DELETE api/notes/:id
// @desc    Delete a note
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) return res.status(404).json({ message: 'Note not found' });

    // Make sure user owns note
    if (note.user.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    await Note.findByIdAndDelete(req.params.id);
    res.json({ message: 'Note removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
