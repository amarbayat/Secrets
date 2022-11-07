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

const _ = require('lodash');
const session = require('express-session');

app.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: false
}));

const passport = require('passport');

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
        type: String,
        unique: true
    }
});

secretSchema.plugin(passportLocalMongoose);

const Secret = mongoose.model('Secrets', secretSchema);

passport.use(Secret.createStrategy());
passport.serializeUser(Secret.serializeUser());
passport.deserializeUser(Secret.deserializeUser());

app.get('/', (req, res) => {
    res.render('home.ejs');
});

app.route('/login')
    .get((req, res) => {
        res.render('login.ejs');
    })
    .post((req, res) => {
        const user = new Secret({
            username:req.body.username,
            password:req.body.password
        });
        
        req.login(user,(err)=>{
            if(err){
                console.log(err);
            }
            else{
                passport.authenticate("local")(req,res,()=>{
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
        Secret.register({username:req.body.username}, req.body.password ,(err,user)=>{
            if(err){
                console.log(err)
                res.redirect('/register');
            }
            else{
                passport.authenticate("local")(req,res,()=>{
                    res.redirect('/secrets');
                })
            }
        });
    });

app.get('/secrets',(req,res)=>{
    if (req.isAuthenticated()){
        res.render('secrets');
    }
    else{
        res.redirect('login');
    }
});

app.get('/logout',(req,res)=>{
    req.logout((err)=>{
        if(err) {
            console.log(err);
        }
        res.redirect('/');
    });
});

app.listen(port, () => {
    console.log(`Server is listening on port ${port}`);
});