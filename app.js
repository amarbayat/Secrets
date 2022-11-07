require('dotenv').config();

const express = require('express');
const port = 3000;
const app = express();
app.use(express.static("public"));

const ejs = require('ejs');
app.set('view engine', 'ejs');

const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({
    extended: true
}));

const findOrCreate = require('mongoose-findorcreate');
const _ = require('lodash');
const session = require('express-session');

app.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: false
}));

const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;

app.use(passport.initialize());
app.use(passport.session());

const passportLocalMongoose = require('passport-local-mongoose');


const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/secretsDB')

const secretSchema = new mongoose.Schema({
    username: {
        type: String,
        unique: true
    },
    password: {
        type: String
    },
    googleId: String
    
});

const allSecretSchema = new mongoose.Schema({
    secretPost: String
});

secretSchema.plugin(passportLocalMongoose);
secretSchema.plugin(findOrCreate);

const Secret = mongoose.model('Secrets', secretSchema);
const allSecret = mongoose.model('allSecrets', allSecretSchema);

passport.use(Secret.createStrategy());

passport.serializeUser(function (user, cb) {
    process.nextTick(function () {
        cb(null, {
            id: user.id,
            username: user.username,
            name: user.name
        });
    });
});

passport.deserializeUser(function (user, cb) {
    process.nextTick(function () {
        return cb(null, user);
    });
});

passport.use(new GoogleStrategy({
        clientID: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        callbackURL: "http://localhost:3000/auth/google/secrets",
        userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
    },
    function (accessToken, refreshToken, profile, cb) {

        Secret.findOrCreate({
            googleId: profile.id
        }, function (err, user) {
            return cb(err, user);
        });
    }
));

passport.use(new FacebookStrategy({
        clientID: process.env.FB_CLIENT_ID,
        clientSecret: process.env.FB_CLIENT_SECRET,
        callbackURL: "http://localhost:3000/auth/facebook/secrets"
    },
    function (accessToken, refreshToken, profile, cb) {
        Secret.findOrCreate({
            facebookId: profile.id
        }, function (err, user) {
            return cb(err, user);
        });
    }
));

app.get('/', (req, res) => {
    res.render('home.ejs');
});

app.route('/login')
    .get((req, res) => {
        res.render('login.ejs');
    })
    .post((req, res) => {
        const user = new Secret({
            username: req.body.username,
            password: req.body.password
        });

        req.login(user, (err) => {
            if (err) {
                console.log(err);
            } else {
                passport.authenticate("local")(req, res, () => {
                    res.redirect('/secrets');
                })
            }
        });

    });

app.route('/register')
    .get((req, res) => {
        res.render('register.ejs');
    })
    .post((req, res) => {
        Secret.register(new Secret({username: req.body.username}), req.body.password, (err, user) => {
            if (err) {
                console.log(err)
                res.send('There was an error during registration');
            } else {
                passport.authenticate("local")(req, res, () => {
                    res.redirect('/secrets');
                });
            }
        });
    });

app.get('/secrets', (req, res) => {
    if (req.isAuthenticated()) {
        allSecret.find({},(err, result) => {
            if (!err) {
                res.render('secrets',{
                    secretPosts:result
                });
            }
            else{
                console.log(err);
                res.redirect('/')
            }
        });
    } else {
        res.redirect('login');
    }
});

app.get('/logout', (req, res) => {
    req.logout((err) => {
        if (err) {
            console.log(err);
        }
        res.redirect('/');
    });
});

app.get('/auth/google', passport.authenticate('google', {
    scope: ['profile']
}));

app.get('/auth/google/secrets',
    passport.authenticate('google', {
        failureRedirect: '/login'
    }),
    function (req, res) {
        // Successful authentication, redirect home.
        res.redirect('/secrets');
    });

app.get('/auth/facebook',
    passport.authenticate('facebook'));

app.get('/auth/facebook/secrets',
    passport.authenticate('facebook', {
        failureRedirect: '/login'
    }),
    function (req, res) {
        // Successful authentication, redirect home.
        res.redirect('/secrets');
    });


app.route('/submit')
    .get((req, res) => {
        res.render("submit.ejs");
    })
    .post((req, res) => {
        const secretMessage = req.body.secret;

        const newPost = new allSecret({
            secretPost: secretMessage
        });
        newPost.save();
        res.redirect('/secrets');
    });

app.post('/deletePost',(req,res)=>{
    msgToDelete = req.body.msgDelete;

    allSecret.deleteOne({secretPost:msgToDelete},(err,result)=>{
        if(!err){
            //res.write(`Http Status Code: 200 OK - ${result}`);
            res.redirect('/secrets');
        }
        else{
            //res.write(err);
            res.redirect('/secrets');
        }
    });
})

app.listen(port, () => {
    console.log(`Server is listening on port ${port}`);
});