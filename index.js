// init project
import express from 'express';
import { fileURLToPath } from 'url';
import path from 'path';
import mongoose from 'mongoose';
import mongo from 'mongodb';
import bodyParser from 'body-parser';
import { v4 as uuidv4 } from 'uuid';

// mongoose.connect(process.env.DB_URI);
// mongoose.connect(database_uri);
// ↑↑↑ temporary variable in brackets as a solution to make it work locally, I create it on top of the file and don't commit it

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

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));
// parse application/json
app.use(bodyParser.json());

// POST /api/users gets JSON bodies
app.post('/api/shorturl', function (req, res) {
  let client_submitted_url = req.body.url;
  let suffix = uuidv4();
  console.log('POST request called');
  console.log(suffix, ' <= this will be our suffix');

  res.json({
    success: 'placeholder for shortened URL',
    original_url: client_submitted_url,
    suffix: suffix,
  });
});

// listen for requests :)
const listener = app.listen(port, () => {
  console.log(`Your app is listening on port ${listener.address().port}`);
});
