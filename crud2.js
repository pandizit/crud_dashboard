const randnumber = require('rand-token').generator({ chars: '0-9' });
const randtoken = require('rand-token').generator({ chars: 'a-z' });
const md5 = require('md5');
const bodyParser = require('body-parser');
var session = require('express-session');
const mongodb = require('mongodb').MongoClient;
const express = require('express');
const app = express();
const port = 8181;

app.use('/bootstrap', express.static('node_modules/bootstrap/dist'));
app.use('/jquery', express.static('node_modules/jquery/dist'));
app.use('/fortawesome', express.static('node_modules/@fortawesome/fontawesome-free'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
    secret: 'validasi',
    resave: true,
    saveUninitialized: true
}));

app.set('view engine', 'ejs');
app.set('views', 'view');

var dbo;
mongodb.connect('mongodb+srv://admin:8hrNdU6o5cAcrMxl@cluster0.n8sll.mongodb.net/percobaan?retryWrites=true&w=majority', (err, client) => {
    if (err) return console.log(err);
    console.log('Connected to Database');
    dbo = client.db();
    
});

var middleware = function (req, res, next) {
    var cek = true;
    if(req.path=='/login'){
        cek = false;
    }
    if(cek){
        if(req.session.userid==undefined){
            res.redirect('/login');
        } else {
            next();
        }
    } else {
        next();
    }
}
app.use(middleware);

app.get('/', (req, res) => {
    if(req.session.type=='admin'){
        dbo.collection('user').find({type: {$not:  {$regex: 'admin'}}}, {_id:0, userid:'', token: 0}).toArray(function(err, result){
            req.data = result;
            req.title = 'Home';
            res.render('home', {req: req});
        });
    } else {
        req.title = 'Informasi User';
        res.render('home', {req: req});
    }
});

app.get('/login', (req, res) => {
    req.title = 'Login User';
    res.render('login', {req: req});
});

app.post('/login', (req, res) => {
    dbo.collection('user').findOne({username: req.body.username, password: md5(req.body.password)}, function(err, result){
        if(result!=null){
            req.session.userid = result.userid;
            req.session.username = result.username;
            req.session.type = result.type;
            res.redirect('/message?success=login berhasil !');
        } else {
            res.redirect('/login?username='+req.body.username+'&fail=Username atau password salah !');
        }
    });
});

app.get('/add', (req, res) => {
    if(req.session.type=='admin'){
        req.title = 'Add New User';
        res.render('add', {req: req});
    } else {
        res.redirect('/message?fail=Anda bukan admin !');
    }
});

app.post('/add', (req, res) => {
    if(req.session.type=='admin'){
        var newuserid = randnumber.generate(6);
        dbo.collection('user').insertOne({
            userid: newuserid,
            token: randtoken.generate(12),
            username: req.body.username, ////// required ////
            password: md5(req.body.password), ////// required ////
            type: 'user'
        }, function(err, result){
            res.redirect('/message?success=Pembuatan User baru berhasil !');
        });
    } else {
        res.redirect('/message?fail=Anda bukan admin !');
    }
});

app.get('/edit', (req, res) => {
    req.user = req.session;
    req.title = "Ubah Profil";
    res.render('edit', {req: req});
});

app.get('/edit/:userid', (req, res) => {
    if(req.session.type=='admin'){
        dbo.collection('user').findOne({userid: req.params.userid}, function(err, result){
            req.user = result;
            req.title = "Ubah User";
            res.render('edit', {req: req});
        });
    } else {
        res.redirect('/message?fail=Anda bukan admin !');
    }
});

app.post('/edit', (req, res) => {
    if(req.session.type=='admin'){
        dbo.collection('user').update({userid: req.body.userid}, {$set: {
            username: req.body.username,
            password: md5(req.body.password)
        }}, function(err, result){
            res.redirect('/message?success=Perubahan data User berhasil disimpan !');
        });
    } else {
        res.redirect('/message?fail=Anda bukan admin !');
    }
});

app.post('/del', (req, res) => {
    if(req.session.type=='admin'){
        dbo.collection('user').deleteOne({userid: req.body.userid}, function(err, result){
            res.redirect('/message?success=User berhasil dihapus !');
        });
    } else {
        res.redirect('/message?fail=Anda bukan admin !');
    }
});

app.get('/message', (req, res) => {
    req.title = 'Success';
    res.render('message', {req: req});
});

app.get('/out', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});


app.listen(port, () => {
    console.log(`Dashboard app listening at http://localhost:${port}`);
})