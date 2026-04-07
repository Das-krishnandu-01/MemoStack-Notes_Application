const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, default: '' },
  body: { type: String, default: '' },
  color: { type: String, default: 'note-yellow' },
  updated: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Note', noteSchema);
