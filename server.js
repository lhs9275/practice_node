const express = require('express');
const methodOverride = require('method-override');
const { MongoClient } = require('mongodb');
const app = express();
const passport = require('passport'); 
const localStrategy = require('passport-local').Strategy;
const session = require('express-session');
const GridFSBucket = require('mongodb/lib/gridfs-stream');
let multer = require('multer');
var storage = multer.diskStorage({
    destination : function(req, file, cb){
        cb(null, './public/images')
    },
    filename : function(req, file , cb){
        cb(null,file.originalname)
    }
});

var upload = multer({storage: storage});

app.use(session({
    secret: 'password',
    resave: true,
    saveUninitialized: false,
    cookie: {
        secure: false,
        maxAge: 3600000, // 1 hour
    }
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.set('views', './views');
app.use(methodOverride('_method'));

// DB in bord.post
let db;
//DB in bord.counter
let db_2;
//DB in bord.login
let db_3;


MongoClient.connect('mongodb+srv://hslee9275:dlgustn00@first.z34fgef.mongodb.net/', function (err, client) {
    if (err) {  
        console.error('MongoDB 연결 중 오류:', err);
        return;
    }
    console.log('MongoDB에 성공적으로 연결되었습니다');
    db = client.db('bord').collection('post'); //게시물 DB
    db_2 = client.db('bord').collection('counter'); // 게시물 번호 DB
    db_3 = client.db('bord').collection('login');
    setupServer();
});

function setupServer() {
    app.listen(3000, function () {
        console.log('서버가 3000 포트에서 실행 중입니다.');
    });


    app.get('/regsiter',function(req,res){
        res.render('regsiter.ejs');
    })

    app.post('/regsiter',function(req,res){
        db_3.insertOne({id : req.body.id ,pw : req.body.pw},function(err,result){
            res.send("<script>alert('회원가입 성공!.');location.href='/login';</script>");
        })
    })

    app.get('/login',function(req,res){
        res.render('login.ejs');
    })

    app.post('/login', passport.authenticate('local', {
        failureRedirect : '/login' // login 을 실패하면 /fail 경로로 이동한다.
    }), function(req, res){
        res.redirect('/main'); // login 을 성공하면 / 경로로 이동한다.
    })

    app.get('/mypage', doLogin , function(req,res){
        res.render('my_page.ejs', {user : req.user});
    })

    function doLogin(req,res,next){
        if (req.user){
            next();
        }
        else{
            res.send("<script>alert('로그인이 필요합니다.');location.href='/login';</script>");
        }
    }




        //로그인 확인 로직
        passport.use(new localStrategy({
            usernameField : 'id', // name 이 id 인 input 이 usernameField 이다.
            passwordField : 'pw', // name 이 pw 인 input 이 passwordField 이다.
            session : true, // session 정보를 저장한다.
            passReqToCallback : false, // 아이디,비밀번호 외 다른 정보를 검증할 경우 true 로 작성, 콜백함수에 req 파라미터를 넣어준다.
        }, function(inputId, inputPw, done){
        
            console.log(inputId, inputPw); // 사용자가 입력한 아이디, 비밀번호 확인
        
            // db.collection 중 login 에서 id 가 inputId 와 일치하는 데이터를 찾으면
            db_3.findOne({id : inputId}, function(err, result){
                if (err) return done(err);
        
                // result 에 아무런 값이 담겨있지 않다면(DB 에 아이디가 없으면)
                if (!result) return done(null, false, {message : '존재하지 않는 아이디입니다.'});
        
                // result 에 값이 담겨 있다면(DB 에 아이디가 있다면)
                // inputPw 와 result 에 담겨있는 pw 가 일치하는지 확인하기
                if (inputPw == result.pw) {
                    return done(null, result);
                } else {
                    return done(null, false, {message : '비밀번호가 다릅니다.'})
                }
            })
        }));

    // id 를 이용하여 세션 저장 및 쿠키 발행 (로그인 성공 시)
    passport.serializeUser(function(user, done){
        done(null, user.id);
    });

    passport.deserializeUser(function(userId, done) {
        // 여기서 사용자를 ID로 찾아서 done 콜백에 전달
        db_3.findOne({ id: userId }, function(err, result) {
            done(err, result);
        });
    });

    app.get('/', function(req,res){
        res.render('login.ejs');
    })


    app.get('/main', function (req, res) {
        db.find().toArray(function (err, result) {
            if (err) {
                console.error('데이터 조회 중 오류:', err);
                res.status(500).send('데이터를 조회하는 중 오류가 발생했습니다.');
                return;
            }
            console.log(result);
            res.render('hi', { post: result });
        });
    });

    app.get('/write', function (req, res) {
        res.render("write");
    });

    app.post('/add', function (req, res) {
        if (!db) {
            return res.status(500).send('데이터베이스에 연결되지 않았습니다.');
        }

        db_2.findOne({ name: '개시물수' }, function (err, result) {
            if (err) {
                console.error('데이터 조회 중 오류:', err);
                return res.status(500).send('데이터를 조회하는 중 오류가 발생했습니다.');
            }

            var totalpost = result.totalpost;

            db.insertOne({ _id: totalpost + 1, 제목: req.body.title, 데이터: req.body.data }, function (err, result) {
                if (err) {
                    console.error('데이터 추가 중 오류:', err);
                    return res.status(500).send('데이터를 추가하는 중 오류가 발생했습니다.');
                }
                console.log('데이터 추가 완료:', result);
                res.redirect('/main'); // 데이터 추가 후 홈 페이지로 리디렉션

                db_2.updateOne({ name: '개시물수' }, { $inc: { totalpost: 1 } }, function (err, result) {
                    if (err) {
                        console.error('데이터 업데이트 중 오류:', err);
                    }
                });
            });
        });
    });

    app.delete('/delete', function (req, res) {
        req.body._id = parseInt(req.body._id);
        db.deleteOne(req.body, function (err, result) {
            if (err) {
                console.error('게시물 삭제 중 오류:', err);
                return res.status(500).send('게시물 삭제 중 오류가 발생했습니다.');
            }
            console.log('게시물 삭제 완료');
            res.status(200).send({ message: '성공했습니다.' });
        });
    });

    app.get('/edit/:id', function(req, res){
        // DB 에서 게시글 불러오기
        req.params.id = parseInt(req.params.id);
        db.findOne({_id : req.params.id}, function(err, result){
            res.render('edit.ejs', {edit : result});
        });
    });
  
    app.put('/edit', function(req, res){
        // 폼에 기재된 데이터를 db.collection 에 업데이트하기
        req.body.id = parseInt(req.body.id);
        db.updateOne({_id : req.body.id}, {$set : {제목: req.body.content, 데이터 : req.body.date}}, function(){
            console.log('게시물 수정 완료');
            res.redirect('/main'); 
        });
    });

    app.get('/upload', function(req,res){
        res.render("upload.ejs");
    });

    app.post('/upload', upload.single('image'), function(req,res){
        res.redirect('/main');
    });
   
}
