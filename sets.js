var express = require('express');
var router = express.Router();
var Set = require('../models/set');
var Ques = require('../models/ques.js');


router.get('/new', isLoggedIn, function(req, res)
{
   res.render('sets/new'); 
});

function isLoggedIn(req, res, next)
{
    if(req.isAuthenticated()) return next();
    else {
        req.flash("error", "Please Login First!");
        res.redirect('/login');
    }        
}



router.get('/', function(req, res)
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
          res.render('sets/index', {sets: allsets});
      }
   }); 
});

var curLine = 0;
var ar = [];

var punc = '[^a-zA-Z0-9]';
var wordEnd = '('+punc+'+.*|$)';
var wordStart = '('+punc+'+.*|^)';

var actualPunc = '[^a-zA-Z0-9\s]';
var ansEnd = '('+actualPunc+'+.*|$)';


function tossup(strIn)
{
    var str = strIn.toLowerCase();
    if(str.match(/.*toss-up.*|^tu .*|.* tu .*/)) return "toss-up";
    if(str.match(/.*bonus.*/)) return "bonus";
    return false;
}

function topic(strIn)
{
    var str = strIn.toLowerCase();
    if(str.match(wordStart+'bio[logy]*'+wordEnd)) return "Biology";
    if(str.match(wordStart+'chem[istry]*'+wordEnd)) return "Chemistry";
    if(str.match(wordStart+'phys[ics]*'+wordEnd)) return "Physics";
    if(str.match(wordStart+'math'+wordEnd)) return "Math";
    if(str.match(wordStart+'(^ess|'+punc+'+ess|earth and space|astronomy|earth science)'+wordEnd)) return "Earth and Space Science";
    if(str.match(wordStart+'energy'+wordEnd)) return "Energy";
    return "Trivia";
}

function otherStart(strIn)
{
    // if(ans(strIn)) return false;
    
    var str = strIn.toLowerCase();
    if(str.match(/multiple|choice|short|answer/)) return true;
    return false;
}

function partOfQ(strIn)
{
    if(strIn.match('[xX]$'))console.log(strIn);
    // console.log(strIn.match('^'+punc+'$')+"?");
    if(tossup(strIn)) console.log(1);
    if(topic(strIn) !== 'Trivia') console.log(2);
    if(otherStart(strIn)) console.log(3);
    if(strIn.match('^'+punc+'$')) console.log(4);
    if(tossup(strIn) || topic(strIn)!=='Trivia' || otherStart(strIn) || strIn.match('^'+punc+'$')) return false;
    return true;
}

function partOfAns(strIn)
{
    // console.log(strIn+' '+ans(strIn)+' '+strIn.match('^'+punc+'+$'));
    if(ans(strIn) || strIn.match('^'+punc+'+$')) return false;
    return true;
}

function ans(strIn)
{
    var str = strIn.toLowerCase();
    var tok = str.split(/[ \t]+/);
    if(tok[0].match('^ans[wer]*'+ansEnd)) return true;
    return false;
}

function note(strIn)
{
    var str = strIn.toLowerCase();
    if(str.match(wordStart+'note'+ansEnd)) return true;
    if(str.match(wordStart+'\\\(solution'+ansEnd)) return true;
    return false;
}

function findLine()
{
    // console.log(curLine+' '+ar.length);
        var l = "";
        do {
            if(!isEmptyString(l)) console.log(curLine+" "+ar[curLine].substring(0,10));
                if(ar.length > curLine) {
                        l = ar[curLine++];
                }
        }
        while(isEmptyString(l) && ar.length > curLine);
        // l = l.replace('\r', '<\\br>');
        return l;
}

function isEmptyString(str)
{
        if(str.match(/[a-zA-Z0-9]+/)) return false;
        return true;
}

var qs = [];

function isMC(str)
{
    var tok = str.split(/[ \t]+/);
    var ct = 0;
    for(var i=1; i<tok.length; i++)
    {
        if(tok[i].match('^[wWxXyYzZ][\\\):-]$')) 
        {
            ct ++;
        }
    }
    return ct > 3;
}

function parseRecur(file, setName, callback)
{
    var q = {};
    console.log(curLine);
    var line = findLine();
    console.log("line2 "+line);
    var tok = line.split(/[ \t]+/);
    
    q.setName = setName;
    
    var bigStr = '';
    while(curLine < ar.length && !ans(line))
    {
        if(!line.match('Page [\\\d]+$') && !line.match('[Rr][Oo][Uu][Nn][Dd] [\\\d]+')) bigStr += line+' ';
        line = findLine();
    }
    
    var ansStr = line+' '; var note1 = '';
    line = findLine();
    
    var wentIn = false;
    while(curLine < ar.length && partOfQ(line))
    {
        // console.log("A"+line);
        wentIn = true;
        if(note(line)) note1 = line.substring(5);
        else if(!line.match('Page [\\\d]+$') && !line.match('[Rr][Oo][Uu][Nn][Dd] [\\\d]+')) ansStr += line+' ';
        line = findLine();
    }
    if(curLine < ar.length) curLine--;
    
    // console.log(">>"+line.substring(0,10)+" "+ar[curLine].substring(0,10)+" "+curLine);
    var qTok = bigStr.split(/[ \t]+/);
    
    var ind = Math.min(qTok.length-1, 7);
    while(ind>=0 && partOfQ(qTok[ind]))
    {
        ind--;
    }

    q.question = ''; q.answer = ''; q.note = ''; q.topic = '';

    for(var i=ind+1; i<qTok.length; i++) q.question += qTok[i]+(i==qTok.length-1?'':' ');
    // q.question = reformatChoices(q.question);
    
    q.isMC = isMC(q.question);
    // if(q.isMC) console.log("T");
    
    ind = 0;
    var aTok = ansStr.split(/[ \t]+/);
    while(ind < aTok.length && !partOfAns(aTok[ind]))
    {
        ind++;
    }

    for(var i=ind; i<aTok.length; i++) q.answer += aTok[i]+(i==aTok.length-1?'':' ');
    
    q.topic = topic(bigStr);

    if(note1) q.note = note1;
    // if(curLine < ar.length) 
    // {  
    //     // line = findLine();
    //     if(note(line)) q.note = line.substring(5);
    //     else curLine--;
    //     // line = findLine();
    // }

    // console.log('T: '+q.topic);
    // console.log('Q: '+q.question);
    // console.log('A: '+q.answer);
    // console.log('N: '+q.note);
    
    Ques.findOne({question: q.question, answer: q.answer}, function(err, repeat)
    {
       if(err) console.log(err);
       if(!repeat)
       {
            Ques.create(q, function(err, question)
            {
                    if(err) console.log(err);
                    else {
                        qs.push(question);
                        console.log("yay "+qs.length+' '+curLine+' '+ar.length);
                        // console.log("ANS"+question.answer);
                        
                        if(curLine < ar.length) 
                        {   
                            var ret =  parseRecur(file, setName, callback);
                            // console.log("GOT & RETURNING "+ret.length);
                            // console.log(qs.length);
                        }
                        else 
                        {
                            // console.log("RETURNING "+qs.length);
                            callback();
                            return qs;
                        }
                    }
            });           
       }
       else 
       {
           console.log("repeated q!");
           if(curLine < ar.length) 
            {   
                var ret =  parseRecur(file, setName, callback);
                // console.log("GOT & RETURNING "+ret.length);
                // console.log(qs.length);
            }
            else 
            {
                // console.log("RETURNING "+qs.length);
                callback();
                return qs;
            }
       }
               
    });

}

String.prototype.replaceAll = function(search, replacement) {
    var target = this;
    return target.split(search).join(replacement);
};

function parser(file, setName, callback2)
{
    var textType = /text.*/;
    qs = []; curLine = 0;
	if(true || file.type.match(textType)) {
    // 	var reader = new FileReader();
    // 	reader.onload = function(e) {
            // file += 'TOSS-UP BIO Short Answer Last Q?\nANS:Last Ans\n';
            file = file.replaceAll(' ANSWER:', '\nANSWER:');
            ar = file.split(/[\n\r]/);
            // console.log(ar[0]+" FIRST LINE");
            var q = {};

            var toBeRet = parseRecur(file, setName, function()
            {
                console.log("HERE"+qs.length);
                callback2();
            });
            // console.log("HERE"+qs);
                            // l = "bob";
    //                      while(l.length > 0)
    //                      {
    //                         l = findLine(ar);
    //                         console.log(l);
    //                      }
        // }

    // 	reader.readAsText(file);
    }
    else {
    }
    // console.log(qs.length);
    // return qs;
}

var curSet = {};
router.post("/", isLoggedIn, function(req, res)
{
    // console.log("hi");
    // console.log(req.body.fileInput)
    var file = req.body.fileInput;
    
    curSet = {};
    // console.log()
    curSet.qs = [];
    curSet.name = req.body.name;
    curSet.author = {};
    curSet.author.id = req.user._id;
    curSet.author.name = req.user.username;
    
    parser(file, curSet.name, function()
    {
        // console.log("AFTER CALL"+curSet.qs[0].answer);
        Set.create(curSet, function(err, newSet)
        {
            if(err) console.log(err);
            else 
            {
                // console.log(newSet.qs[0].answer+"XXXT");
                qs.forEach(function(q)
                {
                    newSet.qs.push(q._id);
                });
                newSet.save(function(err, saveSet)
                {
                   if(err) console.log(err);
                   else
                   {
                        console.log("newSet0"+newSet.qs);
                        res.redirect("/sets");                       
                   }
                });

            }
        });
        

    });
    
    
    

    // res.render("upload.ejs", ); 
});

router.get("/:id", function(req, res)
{
    Set.findById(req.params.id).populate("qs").exec(function(err, foundSet)
    {
        if(err) console.log(err);
        else
        {
            // console.log(foundSet.qs[0]+" "+foundSet.name+" "+"in show")

            console.log(foundSet.qs[0]+" "+foundSet.length);
            if((req.user && (req.user.isAdmin || req.user._id.equals(foundSet.author.id))) || (/[Ss]et \d+/).test(foundSet.name)) res.render('sets/show', {foundSet: foundSet});
            else 
            {
                req.flash('error', 'unauthorized request')
                res.redirect("/sets");
            }
        }
    });
});

router.get("/:id/:q_id/edit", isLoggedIn, function(req, res)
{
    Ques.findById(req.params.q_id, function(err, foundQ)
    {
        if(err) console.log(err);
        else 
        {
            Set.findById(req.params.id).populate("qs").exec(function(err, foundSet)
            {
                if(err) console.log(err);
                else
                {
                    if(req.user.isAdmin || req.user._id.equals(foundSet.author.id)) res.render('sets/edit', {curSetId: req.params.id, foundQ: foundQ});
                    else 
                    {
                        req.flash('error', 'unauthorized request')
                        res.redirect("/sets");
                    }
                }
            });
        }
    })
});

router.put("/:id/:q_id", isLoggedIn, function(req, res)
{
    var q = req.body.q;
    
    q.tu = (q.isTU == 'True' ? true : false);
    console.log(q.topic);
    
    Set.findById(req.params.id).populate("qs").exec(function(err, foundSet)
    {
        if(err) console.log(err);
        else
        {
            if(req.user.isAdmin || req.user._id.equals(foundSet.author.id))
            {
                    Ques.findOneAndUpdate({_id: req.params.q_id}, q, function(err, updatedQ)
                    {
                        if(err)
                        {
                            console.log(err);
                        }
                        else {
                            console.log(req.params.q_id);
                            res.redirect("/sets/"+req.params.id);
                        }
                    });
            }
            else 
            {
                req.flash('error', 'unauthorized request')
                res.redirect("/sets");
            }
        }
    });
            

});

router.delete("/:id/:q_id", isLoggedIn, function(req, res)
{
    Set.findById(req.params.id).populate("qs").exec(function(err, foundSet)
    {
        if(err) console.log(err);
        else
        {
            if(req.user.isAdmin || req.user._id.equals(foundSet.author.id)) 
            {
                Ques.findOneAndRemove({_id: req.params.q_id}, function(err)
                {
                   if(err) console.log(err);
                   else
                   {
                       res.redirect("/sets/"+req.params.id);
                   }
                });  
            }
            else 
            {
                req.flash('error', 'unauthorized request')
                res.redirect("/sets");
            }
        }
    });
});

router.delete("/:id", isLoggedIn, function(req, res)
{
    Set.findOne({_id: req.params.id}, function(err, foundSet)
    {
        if(err) console.log(err);
        else if(req.user.isAdmin || req.user._id.equals(foundSet.author.id))
        {
            Ques.deleteMany({setName: foundSet.name}, function(err)
            {
                if(err) console.log(err);
                else 
                {
                    Set.findOneAndDelete({_id: req.params.id}, function(err)
                    {
                       if(err) console.log(err);
                       else res.redirect("/sets");
                    });
                }
            })
        }
        else {
                req.flash('error', 'unauthorized request')
                res.redirect("/sets");            
        }
    })
});

router.put("/:id", isLoggedIn, function(req, res)
{
    Set.findOne({_id: req.params.id}, function(err, foundSet)
    {
        var file = req.body.fileInput;
        console.log(file.substring(0, 10));
        curSet = foundSet;
        // curSet = {};
        // // console.log()
        // curSet.qs = [];
        // curSet.name = req.body.name;
        // curSet.author = {};
        // curSet.author.id = req.user._id;
        // curSet.author.name = req.user.username;
        
        parser(file, curSet.name, function()
        {
            console.log("AFTER CALL"+req.params.id);
            Set.findOneAndUpdate({_id: req.params.id}, curSet, function(err, updateSet)
            {
                console.log("uwu"+updateSet.name);
                if(err) console.log(err);
                else 
                {
                    // console.log(newSet.qs[0].answer+"XXXT");
                    
                    // Ques.find({setName: foundSet.name}, function(err, foundQs)
                    // {
                    //     if(err)
                    //     {
                    //         console.log(err);
                    //     }
                    //     else
                    //     {
                    //         for(var i=0; i<foundQs.length; i++) 
                    //         {
                    //             var bool = false;
                    //             for(var j=0; j<updateSet.qs.length; j++)
                    //             {
                    //                 if(updateSet.qs[j].equals(foundQs[i]._id)) bool = true;
                    //             }
                    //             if(!bool) qs.push(foundQs[i]._id);
                    //         }
                            
                            qs.forEach(function(q)
                            {
                                updateSet.qs.push(q._id);
                            });
                            console.log("HERE shrekyboiz");
                            updateSet.save(function(err, saveSet)
                            {
                               if(err) console.log(err);
                               else
                               {
                                    console.log("updateSet0"+updateSet.qs);
                                    res.redirect("/sets/"+req.params.id);                       
                               }
                            });
                            //     }                
                            // });

                }
            });
        });
    })
})
module.exports = router;