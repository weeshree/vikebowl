var express = require('express'),
    router = express.Router(),
    passport = require('passport'),
    User = require('../models/user'),
    async = require('async'),
    nodemailer = require('nodemailer'),
    crypto = require('crypto'),
    Ques = require('../models/ques'),
    Set = require('../models/set');




// Admin Routes
router.get("/admin", checkAdmin, function(req, res)
{
   User.find({}, function(err, users)
   {
       if(err) 
       {
           req.flash("error", err);
       }
       else 
       {
           User.findOne({username: "weeshree@gmail.com"}, function(err, admin)
          {
              console.log(admin._id+" is ADMIN and "+admin.firstName+" "+admin.buzzers)
               if(err) {
                   req.flash("error", err);
                   res.redirect("back");
               }
               if(!admin.buzzers) admin.buzzers = [admin.username];
               console.log(admin.buzzers+" AT GET ROUTE");
               res.render("admin", {users: users, buzzers: admin.buzzers, page: 'admin'});
           });
       }
    }); 
});

router.post("/admin", checkAdmin, function(req, res)
{
   var buzzers = req.body.buzzer;
  console.log(buzzers);
  
  User.findOne({username: "weeshree@gmail.com"}, function(err, admin)
  {
     if(err) {
         req.flash("error", err);
         return res.redirect("back");
     } 
     admin.buzzers = [];
     if(typeof buzzers === 'string' || buzzers instanceof String) admin.buzzers.push(buzzers);
     else admin.buzzers = buzzers;
     console.log(admin.buzzers+" AT POST ROUTE");
     req.flash("success", "Posting permissions updated");
     admin.save(function(err)
     {
         if(err) console.log(err);
         res.redirect("/");
     });
  });
});


// Auth Routes

// show sign up form
router.get("/register", function(req, res)
{
   res.render("register", {page: 'register'}); 
});

// authentication
router.post("/register", function(req, res)
{
    var newUser = new User(
        {
            username: req.body.username,
            firstName: req.body.firstName,
            lastName: req.body.lastName,
        });
    // console.log(newUser.username);
    var admins = ['weeshree@gmail.com', 'andrew4303@gmail.com', 'ethan.zahid@gmail.com', 'krish.singal2002@gmail.com', 'naveenmukkatt@gmail.com'];
    newUser.isAdmin = admins.indexOf(newUser.username) >= 0;
    
    User.register(newUser, req.body.password, function(err, user)
    {
        if(err)
        {
            req.flash("error", err.message);
            return res.redirect('/register');
        }
        passport.authenticate('local')(req, res, function()
        {
            // console.log(user.isAdmin);
            req.flash("success", "Welcome "+newUser.firstName);
            res.redirect('/'); 
        });
    });
});

// show login form
router.get("/login", function(req, res)
{
   res.render('login', {page: 'login'}); 
});

// login logic
router.post("/login", function(req, res, next) {passport.authenticate('local',
    {
        successRedirect: '/',
        failureRedirect: '/login',
        failureFlash: true,
        successFlash: "Welcome, "+req.body.username.substring(0, req.body.username.indexOf('@'))+"!"
    })(req, res);
});

router.get("/logout", function(req, res)
{
    req.logout();
    req.flash("success", "Goodybe!");
    res.redirect('/');
});


router.get("/forgot", function(req, res)
{
    res.render('forgot');
});

router.post("/forgot", function(req, res)
{
    async.waterfall([
        function(done) {
            crypto.randomBytes(20, function(err, buf) {
               var token = buf.toString('hex');
               done(err, token);
            });
        },
        function(token, done) {
            User.findOne({username: req.body.username}, function(err, user) {
                if(!user) 
                {
                    console.log("NO USER");
                    return res.redirect('/forgot');
                }
                
                user.resetPasswordToken = token;
                user.resetPasswordExpires = Date.now() + 3600000;
                
                user.save(function(err) {
                   done(err, token, user); 
                });
            })
        },
        function(token, user, done) {
            var smtpTransport = nodemailer.createTransport({
                service: 'Gmail',
                auth: {
                    user: 'dullessciencebowl@gmail.com',
                    pass: 'Meta34cognition43' // process.env.GMAILPW
                }
            });
            var mailOptions = {
                to: user.username,
                from: 'dullessciencebowl@gmail.com',
                subject: 'Viking Bowl Password Reset',
                text: 'You are receiving this because someone has requested the reset of the password for your account\n\n' +
                'Please click on the following link, or paste this into your browser to complete the process of resetting your password\n\n' +
                'http://' + req.headers.host + '/reset/' + token + '\n\n' + 
                'If you did not request this, please ignore this email and your password will remain unchanged.'
            };
            smtpTransport.sendMail(mailOptions, function(err)
            {
                req.flash("success", "Password-reset email sent")
                done(err, 'done');
            });
        }
        ], function(err) {
            if(err) console.log("HERE "+err+' '+process.env.GMAILPW);
            res.redirect('/forgot');
        }); 
});


router.get('/reset/:token', function(req, res) {
  User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
    if(err) { 
        console.log(err);
    }
    if(user == null) return res.redirect("/405");
    if (!user) {
    //   req.flash('error', 'Password reset token is invalid or has expired.');
      return res.redirect('/forgot');
    }
    res.render('reset', {token: req.params.token});
  });
});

router.post('/reset/:token', function(req, res) {
  async.waterfall([
    function(done) {
      User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
        if(user == null) return res.redirect("/405");
        if (!user) {
          return res.redirect('back');
        }
        if(req.body.password === req.body.confirm) {
          user.setPassword(req.body.password, function(err) {
            user.resetPasswordToken = undefined;
            user.resetPasswordExpires = undefined;
            
            req.flash("success", "Password successfully changed");
            user.save(function(err) {
              req.logIn(user, function(err) {
                done(err, user);
              });
            });
          })
        } else {
            return res.redirect('back');
        }
      });
    },
    function(user, done) {
      var smtpTransport = nodemailer.createTransport({
        service: 'Gmail', 
        auth: {
          user: 'dullessciencebowl@gmail.com',
          pass: 'Meta34cognition43' // process.env.GMAILPW
        }
      });
      var mailOptions = {
        to: user.username,
        from: 'dullessciencebowl@mail.com',
        subject: 'Your password has been changed',
        text: 'Hello,\n\n' +
          'This is a confirmation that the password for your account ' + user.username + ' has just been changed.\n'
      };
      smtpTransport.sendMail(mailOptions, function(err) {
        done(err);
      });
    }
  ], function(err) {
    res.redirect('/sets');
  });
});

function escapeRegex(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
};

router.get("/search", checkAdmin, function(req, res)
{
    if(req.query.params && req.query.params.length>0)
    {
        // console.log(req.params);
        console.log("nb");
        const regex = new RegExp(escapeRegex(req.query.params), 'gi');
        
        // const regex2 = new RegExp(/[^\^]*/g, 'gi');
        if(req.user.username != "weeshree@gmail.com" )
        {
            Ques.find({ "setName": /^[^\^]/g, $or: [{"question":regex}, {"choices":regex}, {"answer":regex}]}, function(err, allQs)
            {
                if(err) console.log(err);
                else 
                {
                    res.render("search", {allQs: allQs});
                    console.log(allQs);
                }
                    
            });
        }
        else 
        {
            Ques.find({ $or: [{"question":regex}, {"choices":regex}, {"answer":regex}]}, function(err, allQs)
            {
                if(err) console.log(err);
                else 
                {
                    res.render("search", {allQs: allQs});
                    console.log(allQs);
                }
                    
            });
        }
    }
    else
    {
        // console.log(req);
        res.render("search", {allQs:{}}); 
    }
});

// NOT FOUND
router.get("/405", function(req, res)
{
    res.send("Hi");
});

function isLoggedIn(req, res, next)
{
    if(req.isAuthenticated()) return next();
    else {
        req.flash("error", "Please Login First!");
        res.redirect('/login');
    }        
}

function checkAdmin(req, res, next)
{
    if(req.isAuthenticated())
    {
        if(req.user.isAdmin) next();
        else 
        {
            req.flash("error", "Sorry! You don't have permission to view that page");
            res.redirect("back");
        }
    }
    else
    {
        req.flash("error", "Please Login First!");
        res.redirect("/login");
    }
}

function checkBuzzer(req, res, next)
{
    if(req.isAuthenticated())
    {
        if(req.user.isBuzzer || req.user.isAdmin) next();
        else 
        {
            console.log("YO");
            req.flash("error", "Sorry! You don't have permission to view that page");
            res.redirect("/");
        }
    }
    else
    {
        req.flash("error", "Please Login First!");
        res.redirect("/login");
    }
}


/*

*/
router.get("/", function(req, res)
{
    // Ques.remove({}, function(err)
    // {
    //     if(err) console.log(err);
    // });
    User.findOne({username:"weeshree@gmail.com"}, function(err, admin)
    {
        if(err) console.log(err);
        if(!admin) {res.render("home.ejs"); return;}
        if(req.user && admin.buzzers.indexOf(req.user.username)>=0)
        {
            req.user.isBuzzer = true;
            
            req.user.save(function(err, savedUser)
            {
                if(err) console.log(err);
                res.render("home.ejs");
            })
        }
        else if(req.user && !req.user.isAdmin) 
        {
            req.user.isBuzzer = false;
        
            req.user.save(function(err, savedUser)
            {
                if(err) console.log(err);
                res.render("home.ejs");
            })
        }
        else res.render("home.ejs");
    });

});


router.get("/upload", function(req, res)
{
    Ques.find({}, function(err, qus)
    {
       if(err) console.log("Error retrieving qs!\n"+err);
       else 
        {
          console.log(qus[3]);
          res.render("upload.ejs", {qs: qus});
        }
    });
});


router.get("/play", checkBuzzer, function(req, res)
{
    Set.find({}, function(err, allsets)
    {
        if(err)
        {
            console.log(err);
        }
        else
        {
            allsets.sort(function(a,b)
            {
              if(a.name < b.name) return -1;
              if(a.name > b.name) return 1;
              return 0;
            });
            res.render('settings', {sets: allsets});
        }
    }); 
});

router.get("*", function(req, res)
{
    res.redirect("/405");
});




module.exports = router;