var express = require('express');
var router = express.Router();
var Set = require('../models/set');
var Ques = require('../models/ques.js');

var allQs = [[]];
var rNums = [[]];

function shuffle(ar)
{
    for(var i=0; i<ar.length; i++)
    {
        var ind = Math.floor(Math.random() * ar.length);
        var temp = ar[i];
        ar[i] = ar[ind];
        ar[ind] = temp;
    }
    return ar;
}

var userInds = [];
var goodNames = [[]], goodTopics = [[]];

function getUserInd(req)
{
    var user = req.body.user; var ind  = 0; 
    while(user === null || user === undefined || !user) ;
    console.log("pattatap "+user+" x "+userInds)
    if(!userInds.includes(user)) userInds.push(user);
    else console.log("So it includes it I guess");
    ind = userInds.indexOf(user);
    
    while(goodNames.length<ind+1) goodNames.push([]);
    while(goodTopics.length<ind+1) goodTopics.push([]);
    while(rNums.length<ind+1) rNums.push([]);
    while(allQs.length<ind+1) allQs.push([]);
    while(qCt.length<ind+1) qCt.push(0);
    while(qrCt.length<ind+1) qrCt.push(0);
    return ind;
}

router.post("/play", function(req, res)
{
    console.log(req.body);
    var ind = getUserInd(req);
    
    var arr = req.body.arr;
    var nr = req.body.pr;
    
    qrCt[ind] = qCt[ind] = 0;
    Set.find({}, function(err, allsets)
    {
        if(err)
        {
            console.log(err);
        }
        else
        {
            console.log(ind+" !!!");
            goodNames[ind] = []; goodTopics[ind] = [];
            
            allsets.forEach(function(st)
            {
                if(st && arr[st._id]) goodNames[ind].push(st.name);
            });
            
            if(req.body.Biology) goodTopics[ind].push("Biology");
            if(req.body.Chemistry) goodTopics[ind].push("Chemistry");
            if(req.body.Physics) goodTopics[ind].push("Physics");
            if(req.body.Math) goodTopics[ind].push("Math");
            if(req.body.Earth) goodTopics[ind].push("Earth and Space Science");
            if(req.body.Energy) goodTopics[ind].push("Energy");
            
            // console.log(goodNames);
            // console.log(goodTopics);
            Ques.find({setName: {$in:goodNames[ind]}, topic: {$in:goodTopics[ind]}}, function(err, foundQs)
            {
                if(err)
                {
                    console.log(err);
                }
                else
                {
                    allQs[ind] = shuffle(foundQs);
                    
                    for(var i=0; i<allQs[ind].length; i++) rNums[ind].push(i);
                    rNums[ind] = shuffle(rNums[ind]);
                    
                    // allQs = shuffle(allQs);
                    // console.log(foundQs);
                    res.render("play", {setSize: allQs[ind].length, pr: nr});
                }
            });

        }
    });
    

});


router.post("/play/archive/:rando", function(req, res)
{
    var ind = getUserInd(req);
    var q = req.body.question; var sn = req.body.setName; var user = req.body.user;
    
    Ques.findOne({question: q, setName: sn}, function(err, foundQ)
    {
        if(err) console.log(err);
        if(foundQ === null || foundQ === undefined)
        {
            console.log("Couldn't find or archive question "+q);
            res.send(false);
            return;
        }
        // foundQ.archive = !foundQ.archive;
        if(foundQ.archive.includes(user))
        {
            for(var i=0; i<foundQ.archive.length; i++)
            {
                console.log("foundQ.archive element "+i+" is "+foundQ.archive[i]+" vs "+user);
                if(foundQ.archive[i] === user) { foundQ.archive.splice(i); i--;}
            }
        }
        else foundQ.archive.push(user);
        
        for(var i=0; i<allQs[ind].length; i++) if(allQs[ind][i].question === q && allQs[ind][i].setName == sn) { allQs[ind][i].archive = foundQ.archive; break; }
        
        foundQ.save(function(err, savedQ)
        {
            if(err) console.log(err);
            if(savedQ) res.send(savedQ.archive);
            else res.send(false);
        });
    });
});

router.post("/play/complete/:rando", function(req, res)
{
    var q = req.body.question; var sn = req.body.setName;
    var ind = getUserInd(req);

    // console.log(q+" "+sn+"!");
    Ques.findOne({question: q, setName: sn, topic: {$in: goodTopics[ind]}}, function(err, foundQ)
    {
        if(err) console.log(err);
        if(foundQ === null || foundQ === undefined)
        {
            console.log("Couldn't find question "+q);
            res.send(false);
            return;
        }
        if(req.body.bool==='true')
            foundQ.done.push(req.body.user);
        else
        {
            for(var i=0; i<foundQ.done.length; i++)
            {
                if(foundQ.done[i] === req.body.user) {foundQ.splice(i); i--;}
            }
        }
        for(var i=0; i<allQs[ind].length; i++) if(allQs[ind][i].question === q && allQs[ind][i].setName == sn) 
        {
            console.log("Question found in allQs & updated");
            allQs[ind][i].done = foundQ.done;
            break;
        }
        // console.log(typeof(req.body.bool)+"@APP");
        foundQ.save(function(err, savedQ)
        {
            if(err) console.log(err);
            console.log("Saving in Ques as "+savedQ.done.includes(req.body.user));
            Ques.findOne({question: q, setName: sn}, function(err, foundQ)
            {
               if(err) console.log(err);
              console.log("CHECKING IF DONE: (plays.js) "+foundQ.setName+" "+foundQ.done.includes(req.body.user));
            
                res.send(savedQ.done);
            });
            
        });
    });  
});

var qrCt = [], qCt = [];

router.post("/play/new/:rando", function(req, res)
{
    var ind = getUserInd(req);
    console.log(">> "+ind);
    console.log(goodNames+"___"+goodTopics);
    console.log(goodNames[ind]+" "+goodTopics[ind]+" "+req.body.user);
    // console.log("Searching... "+req.body.arch+" ");
    // console.log(typeof(req.body.arch));

   var arch = (req.body.arch).length===4;
   if(arch)
   {
    //   if(qrCt[ind]===undefined || qrCt[ind] == N)
       for(var i=qrCt[ind]; ; i++)
       {
           console.log("  "+i);
           i%=allQs[ind].length;
           console.log("  "+rNums[ind][i]);
           var q = allQs[ind][rNums[ind][i]];
        //   if(i==allQs.length-1) break;
        //   console.log(q.archive+" >"+req.body.user+"< "+q.archive.includes(req.body.user));
           if(q && q.archive.includes(req.body.user)) 
           {
               console.log("USED");
               qrCt[ind] = i+1;
               res.send(q);
               return;
           }
           
           if(i == (qrCt[ind]-1+allQs[ind].length*allQs[ind].length)%allQs[ind].length) 
           {
              console.log("NO ARCHIVED QUESTIONS");
               for(var i=qCt[ind]; i<allQs[ind].length; i++)
               {
                   var q = allQs[ind][i];
                    //   console.log(i);
                   if(!q.done.includes(req.body.user)) 
                   {
                       qCt[ind] = i+1;
                       res.send(q);
                       return;
                   }
               }
               
               
               
               console.log("Failed to retrieve unseen question. Unsetting all questions...");
               for(var j=0; j<allQs[ind].length; j++) allQs[ind][j].done=[];
               unset(0, res, function()
               {
                   res.send(allQs[ind][0]);
                   qCt[ind] = 1;
               });
               break;
           }
       }
   }
   else
   {
      console.log("in else "+qCt[ind]+" "+allQs[ind].length);
       for(var i=qCt[ind]; i<allQs[ind].length; i++)
       {
           var q = allQs[ind][i];
              console.log(i);
           if(!q.done.includes(req.body.user)) 
           {
               qCt[ind] = i+1;
               res.send(q);
               return;
           }
       }
       
       console.log("Failed to retrieve unseen question. Unsetting all questions...");
       for(var j=0; j<allQs[ind].length; j++) 
       {
           if(allQs[ind][j].done.includes(req.body.user))
           {
               for(var i=0; i<allQs[ind][j].done.length; i++)
               {
                   if(req && req.body && allQs[ind][j].done[i] === req.body.user) 
                   {
                       allQs[ind][j].done.splice(i); i--;
                   }
               }
           }
        //   allQs[j].done=false;
       }
       unset(0, res, req, function()
       {
           res.send(allQs[ind][0]);
           qCt[ind] = 1;
       });
   }
});

function unset(ind, res, req, callback)
{
    if(ind>=allQs[ind].length) 
    {
        // console.log("callback time");
        callback();
        return;
    }
    Ques.findOne({setName: allQs[ind].setName, question: allQs[ind].question}, function(err, foundQ)
    {
        if(err) console.log(err);
        else if(foundQ && foundQ !== null)
        {
            for(var i=0; i<foundQ.done.length; i++)
           {
               if(req && req.body && foundQ.done[i] === req.body.user) 
               {
                   foundQ.done.splice(i); i--;
               }
           }
            foundQ.save(function(err, savedQ)
            {
                // console.log("clear "+ind);
                if(err) console.log(err);
                else unset(ind+1, res, callback);
            });
        }
    })
}

router.post("/play/seen/:rando", function(req, res)
{
    var ind = getUserInd(req);

    var qSeen = 0;
    for(var i=0; i<allQs[ind].length; i++) 
    {
        if(allQs[ind][i].done === undefined) allQs[ind][i].done = [];
        if(allQs[ind][i].done.includes(req.body.user)) 
        {
            qSeen++;
            // console.log("* "+(allQs[i].answer.length>10 ? allQs[i].answer.substring(10): allQs[i].answer));
        }
    }
    console.log("allQs has "+qSeen+" / "+(allQs[ind].length)+" done questions "+req.body.user);
    

    Ques.find({setName: {$in:goodNames[ind]}, topic: {$in:goodTopics[ind]}}, function(err, totQs)
    {
        if(err) console.log(err);
        else
        {
            var ct = 0;
            for(var i=0; i<totQs.length; i++) if(totQs[i].done.includes(req.body.user)) {/*console.log(totQs[i].question.substring(0,5));*/ ct++;}
            console.log("but Ques.find has "+ct+" / "+(totQs.length)+" done questions "+req.body.user);
        }
    })     
    res.send(""+qSeen);
});


module.exports = router;