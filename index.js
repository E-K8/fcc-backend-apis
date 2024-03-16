// init project
import express from 'express';
import { fileURLToPath } from 'url';
import path from 'path';
import mongoose from 'mongoose';
import bodyParser from 'body-parser';
import dns from 'dns';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
dotenv.config();

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

// my first API endpoint
app.get('/api/hello', (req, res) => {
  console.log({ greeting: 'hello API' });
  res.json({ greeting: 'hello API' });
});

app.get('/api', (req, res) => {
  const now = new Date();
  res.json({
    unix: now.getTime(),
    utc: now.toUTCString(),
  });
});

app.get('/api/whoami', (req, res) => {
  res.json({
    ipaddress: req.socket.remoteAddress,
    language: req.headers['accept-language'],
    software: req.headers['user-agent'],
  });
});

app.get('/api/:date', (req, res) => {
  let dateString = req.params.date;
  let passedInValue = new Date(dateString);
  // attempt to convert dateString to a number ↓
  let unixNumber = Number(dateString);

  // check that the conversion was successful and the number is an integer ↓
  if (!isNaN(unixNumber) && unixNumber.toString() === dateString) {
    // the input is a valid Unix timestamp: create a Date object from the number
    passedInValue = new Date(unixNumber);
  } else {
    // the input is not a Unix timestamp: attempt to create a Date object from the string
    passedInValue = new Date(dateString);
  }

  if (passedInValue.toString() === 'Invalid Date') {
    res.json({ error: 'Invalid Date' });
  } else {
    res.json({
      unix: passedInValue.getTime(),
      utc: passedInValue.toUTCString(),
    });
  }
});

// URL shortener

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

// listen for requests :)
const listener = app.listen(port, () => {
  console.log(`Your app is listening on port ${listener.address().port}`);
});
