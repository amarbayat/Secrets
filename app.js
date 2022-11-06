require('dotenv').config();

const express = require('express');
const port = 3000;
const app = express();
app.use(express.static("public"));

const ejs = require('ejs');
app.set('view engine','ejs');

const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({extended: true}));

const _ = require('lodash');
const md5=require('md5');

const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/secretsDB')

const secretSchema = new mongoose.Schema({
    username:{
        type:String,
        required:[true,'Username is required'],
        unique:true
    },
    password:{
        type:String,
        required:[true,'Password is required'],
        unique:true
    }
});

const Secret = mongoose.model('Secrets',secretSchema);

app.get('/',(req,res)=>{
    res.render('home.ejs');
});

app.route('/login')
.get((req,res)=>{
    res.render('login.ejs');
})
.post((req,res)=>{
    const user = req.body.username;
    const pass = md5(req.body.password);

    Secret.findOne({username:user},(err,result)=>{
        if(!err){
            if(result.password === pass){
                res.render('secrets');
            }else{
                console.log("Username/Password is incorrect .. please try again");
            }
        }
    });

});

app.route('/register')
.get((req,res)=>{
    res.render('register.ejs');
})
.post((req,res)=>{
    const user = req.body.username;
    const pass = md5(req.body.password);

    const userCreate = new Secret({
        username:user,
        password:pass
    });

    userCreate.save((err)=>{
        if(!err){
            res.redirect('login');
        }
        else{
            res.redirect('register');
        }
    });

});


app.listen(port,()=>{
    console.log(`Server is listening on port ${port}`);
});