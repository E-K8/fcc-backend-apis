// init project
import express, { response } from 'express';
import { fileURLToPath } from 'url';
import path from 'path';
import mongoose from 'mongoose';
import bodyParser from 'body-parser';
import dns from 'dns';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import dotenv from 'dotenv';
dotenv.config();
const upload = multer({ dest: './public/data/uploads/' });

mongoose
  .connect(process.env.DB_URI)
  .then(() => console.log('MongoDB connection successful'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Define __dirname in ES6 module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

// enable CORS (https://en.wikipedia.org/wiki/Cross-origin_resource_sharing)
// so that my API is remotely testable by FCC
import cors from 'cors';
import { type } from 'os';
app.use(cors({ optionsSuccessStatus: 200 })); // some legacy browsers choke on 204

// http://expressjs.com/en/starter/static-files.html
app.use(express.static('public'));

// http://expressjs.com/en/starter/basic-routing.html
app.get('/', (req, res) => {
  res.sendFile(`${__dirname}/views/index.html`);
});

app.get('/timestamp', (req, res) => {
  res.sendFile(`${__dirname}/views/timestamp.html`);
});

app.get('/requestHeaderParser', (req, res) => {
  res.sendFile(`${__dirname}/views/requestHeaderParser.html`);
});

app.get('/urlShortener', (req, res) => {
  res.sendFile(`${__dirname}/views/urlShortener.html`);
});

app.get('/exerciseTracker', (req, res) => {
  res.sendFile(`${__dirname}/views/exerciseTracker.html`);
});

app.get('/fileMetadata', (req, res) => {
  res.sendFile(`${__dirname}/views/fileMetadata.html`);
});

// my first API endpoint
app.get('/api/hello', (req, res) => {
  console.log({ greeting: 'hello API' });
  res.json({ greeting: 'hello API' });
});

// REQUEST HEADER PARSER
app.get('/api/whoami', (req, res) => {
  res.json({
    ipaddress: req.socket.remoteAddress,
    language: req.headers['accept-language'],
    software: req.headers['user-agent'],
  });
});

// TIMESTAMP MICROSERVICE TODO rework this as it returns "Invalid Date" by default (return here after exercise tracker is finished)
// app.get('/api', (req, res) => {
//   const now = new Date();
//   res.json({
//     unix: now.getTime(),
//     utc: now.toUTCString(),
//   });
// });

// app.get('/api/:date', (req, res) => {
//   let dateString = req.params.date;
//   let passedInValue = new Date(dateString);
//   // attempt to convert dateString to a number ↓
//   let unixNumber = Number(dateString);

//   // check that the conversion was successful and the number is an integer ↓
//   if (!isNaN(unixNumber) && unixNumber.toString() === dateString) {
//     // the input is a valid Unix timestamp: create a Date object from the number
//     passedInValue = new Date(unixNumber);
//   } else {
//     // the input is not a Unix timestamp: attempt to create a Date object from the string
//     passedInValue = new Date(dateString);
//   }

//   if (passedInValue.toString() === 'Invalid Date') {
//     res.json({ error: 'Invalid Date' });
//   } else {
//     res.json({
//       unix: passedInValue.getTime(),
//       utc: passedInValue.toUTCString(),
//     });
//   }
// });

// URL SHORTENER

// URL shortener schema and model
const URLSchema = new mongoose.Schema({
  original_url: { type: String, required: true, unique: true },
  short_url: { type: String, required: true, unique: true },
});

const URLModel = mongoose.model('url', URLSchema);

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));

// URL shortener POST request
app.post('/api/shorturl', async (req, res) => {
  const { url } = req.body;

  try {
    const urlObj = new URL(url);

    dns.lookup(urlObj.hostname, async (err, address) => {
      if (!address) {
        console.log(`Invalid URL: ${url}`);
        res.json({ error: 'invalid url' });
      } else {
        const original_url = urlObj.href;
        let foundURL = await URLModel.findOne({ original_url: original_url });

        if (foundURL) {
          console.log(`URL already shortened: ${original_url}`);
          res.json({
            original_url: foundURL.original_url,
            short_url: foundURL.short_url,
          });
        } else {
          const short_url = uuidv4().slice(0, 8); // Using a slice of UUID for shorter ID
          console.log(
            `Creating new short URL for: ${original_url} -> ${short_url}`
          );

          const newURL = new URLModel({
            original_url,
            short_url,
          });
          await newURL.save();

          res.json({ original_url, short_url });
          console.log(`Short URL created: ${short_url}`);
        }
      }
    });
  } catch (error) {
    console.log('Error processing URL', error);
    res.json({ error: 'invalid url' });
  }
});

// URL shortener GET request
app.get('/', (req, res) => {
  res.sendFile(process.cwd() + '/views/index.html');
});

app.get('/api/shorturl/:short_url', async (req, res) => {
  const { short_url } = req.params;
  const foundURL = await URLModel.findOne({ short_url: short_url });

  if (foundURL) {
    res.redirect(foundURL.original_url);
  } else {
    res.json({ message: 'The short url does not exist!' });
  }
});

// EXERCISE TRACKER

// user schema and model
const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
});
let userModel = mongoose.model('user', userSchema);

// exercise schema and model
const exerciseSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, default: new Date() },
});
let exerciseModel = mongoose.model('exercise', exerciseSchema);

app.post('/api/users', (req, res) => {
  let username = req.body.username;
  let newUser = userModel({ username: username });
  newUser.save();
  res.json(newUser);
});

app.get('/api/users', async (req, res) => {
  try {
    const users = await userModel.find({});
    res.json(users);
  } catch (error) {
    res.status(500).send(error);
  }
});

app.post('/api/users/:_id/exercises', async (req, res) => {
  try {
    console.log(req.body);
    let userId = req.params._id;
    let exerciseObj = {
      userId,
      description: req.body.description,
      duration: parseInt(req.body.duration, 10),
    };

    if (req.body.date) {
      exerciseObj.date = req.body.date;
    } else {
      exerciseObj.date = new Date();
    }

    const newExercise = new exerciseModel(exerciseObj);
    const userFound = await userModel.findById(userId);

    await newExercise.save();

    res.json({
      _id: userFound._id,
      username: userFound.username,
      description: newExercise.description,
      duration: newExercise.duration,
      date: newExercise.date.toDateString(),
    });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .send('Server error occurred while processing your request.');
  }
});

app.get('/api/users/:_id/logs', async (req, res) => {
  try {
    const userId = req.params._id;
    const { from, to, limit } = req.query;

    const userFound = await userModel.findById(userId).exec();

    if (!userFound) {
      return res.status(404).json({ message: 'User not found' });
    }

    let query = { userId: userId };

    if (from) {
      query.date = { $gte: new Date(from) };
    }

    if (to) {
      if (!query.date) query.date = {};
      query.date.$lte = new Date(to);
    }

    let exercisesQuery = exerciseModel.find(query);

    if (limit) {
      exercisesQuery = exercisesQuery.limit(parseInt(limit));
    }

    let exercises = await exercisesQuery.exec();

    // Convert each date to a dateString format
    exercises = exercises.map((exercise) => ({
      ...exercise.toObject(), // Convert the document to a plain JS object
      date: exercise.date.toDateString(), // Convert the date to dateString format
    }));

    const responseObj = {
      _id: userId,
      username: userFound.username,
      log: exercises,
      count: exercises.length,
    };

    res.json(responseObj);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// FILE METADATA

app.post('/api/fileanalyse', upload.single('upfile'), (req, res) => {
  // req.file is the name of my file in the form above, here 'upfile'
  // req.body will hold the text fields, if there were any

  res.json({
    name: req.file.originalname,
    type: req.file.mimetype,
    size: req.file.size,
  });
});

// listen for requests :)
const listener = app.listen(port, () => {
  console.log(`Your app is listening on port ${listener.address().port}`);
});
