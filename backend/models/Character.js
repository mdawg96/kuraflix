const mongoose = require('mongoose');

const CharacterSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  traits: {
    physical: {
      gender: String,
      race: String,
      age: String,
      height: String,
      bodyType: String
    },
    facial: {
      faceShape: String,
      skinTone: String,
      eyeColor: String,
      eyeShape: String
    },
    hair: {
      hairColor: String,
      hairLength: String,
      hairStyle: String
    },
    extras: {
      clothingStyle: String,
      accessories: [String],
      specialFeatures: [String]
    }
  },
  imagePath: {
    type: String,
    required: true
  },
  prompt: {
    type: String
  },
  role: {
    type: String
  },
  artStyle: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Character', CharacterSchema); 