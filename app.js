const express = require('express');
const session = require('express-session');
const app = express();
const bcrypt = require('bcrypt');
const Joi = require('joi');
const usersModel = require('./models/users');
const MongoDBStore = require('connect-mongodb-session')(session);
const dotenv = require('dotenv');
dotenv.config();

let ejs = require('ejs');
app.set('view engine', 'ejs');

var dbStore = new MongoDBStore({
  uri: process.env.MONGODB_URI,
  collection: process.env.MONGODB_COLLECTION
});

app.use(session({
    secret: process.env.NODE_SESSION_SECRET,
    store: dbStore,
    resave: true,
    saveUninitialized: false,
    cookie: {
      // expires in one hour 
      maxAge: 1000 * 60 * 60
    }
}));

// Home route
app.get('/', (req, res) => {
  res.render('index');
})

// Sign up route
app.get('/signUp', (req, res) => {
  res.render('signUp');
})

// urlencoded is a method inbuilt in express to recognize the incoming Request Object as strings or arrays.
app.use(express.urlencoded({ extended: false }));

// sign up and update user MongoDB database
app.use(express.json());
app.post('/signUp', async (req, res) => {
  const schema = Joi.object({
    username: Joi.string()
      .alphanum()
      .min(3)
      .max(15)
      .required()
      .messages({
        'string.alphanum': 'Username must only contain alpha-numeric characters',
        'string.min': 'Username must be between 3 to 15 characters long',
        'string.max': 'Username must be between 3 to 15 characters long',
        'string.empty': 'Username is a required field',
      }),
    password: Joi.string()
      .min(6)
      .max(30)
      .required()
      .messages({
        'string.min': 'Password must be between 6 to 30 characters long',
        'string.max': 'Password must be between 6 to 30 characters long',
        'string.empty': 'Password is a required field',
      }),
    email: Joi.string()
      .email({ minDomainSegments: 2, tlds: { allow: ['com', 'net'] } })
      .required()
      .messages({
        'string.email': 'Please provide a valid email address',
        'string.empty': 'Email is a required field',
      }),
  });

  try {
    const { username, password, email } = await schema.validateAsync(req.body, { abortEarly: false });
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = {
      username: username,
      password: hashedPassword,
      email: email,
    };
    const result = await usersModel.create(user);
    console.log(result);
    res.send(`User created successfully<br> <button><a href="/login">Log In</a></button>`);
  } catch (error) {
    console.log(error);
    const errorMessage = error.details.map(detail => detail.message).join(`. <br>`);
    res.status(400).send(`${errorMessage} <br><button><a href="/signUp">Try Again</a></button>`);
  }
});

// Login route
app.get('/login', (req, res) => {
  res.render('login');
})

// builtin express middleware to parse incoming requests with JSON payloads (based on body)
app.use(express.json())
app.post('/login', async (req, res) => {
  const schema = Joi.object({
    email: Joi.string()
      .email({ minDomainSegments: 2, tlds: { allow: ['com', 'net'] } })
      .required()
      .messages({
        'string.email': 'Incorrect email or password format',
        'string.empty': 'One or more fields are empty',
      }),
    password: Joi.string()
      .pattern(new RegExp('^[a-zA-Z0-9]{3,30}$'))
      .required()
      .messages({
        'string.password': 'Incorrect email or password format',
        'string.empty': 'One or more fields are empty',
      }),
  });

  try {
    const value = await schema.validateAsync({ email: req.body.email, password: req.body.password });
    console.log(value);
  }
  catch (err) {
    console.log(err);
    const errorMessage = err.details[0].message;
    res.status(400).send(`${errorMessage} <br><button><a href="/login">Try Again</a></button>`);
    return;
  }

  // search user in database
  const user = await usersModel.findOne({
    email: req.body.email,
  })

  // if user exists, validate password
  if (user && bcrypt.compareSync(req.body.password, user.password)) {
    // set session variables
    req.session.GLOBAL_AUTHENTICATED = true;
    req.session.username = user.username;
    req.session.email = user.email;
    req.session.password = user.password;
    res.redirect('/loggedIn');
  } else {
    res.send(`Invalid email or password <br><button><a href="/login">Try Again</a></button>`);
  }
});

app.get('/loggedIn', (req, res) => {
  res.render('loggedIn', { username: req.session.username });
})

// for members only
const membersOnly = async (req, res, next) => {
  const user = await usersModel.findOne(
    { 
      username: req.session.username,
      // password: req.session.password
    }
  ) // check if user is logged in
  if (!user) {
    return res.status(401).json({ error: 'You must log in to view this page.' });
  }
  next();
};

// members only route
app.use(membersOnly);
app.use(express.static('public'));
app.get('/members', (req, res) => {
  const randomImageNumber = Math.floor(Math.random() * 3) + 1;
  const image = `00${randomImageNumber}.avif`;
  res.render('members', { username: req.session.username, image });
});

// logout route
app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.log(err);
    } else {
      res.redirect('/');
    }
  });
});

// 404 page not found route
app.get('*', (req, res) => {
  res.status(404).render('404');
});

module.exports = app;