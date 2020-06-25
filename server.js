const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const cors = require('cors')

const mongoose = require('mongoose')
mongoose.set('useFindAndModify', false);

const db = mongoose.connect(
  process.env.URI,
  { useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true },
  error => {
    if (error) console.log(error);
    console.log("connection to the DB successful");
  }
);
const userDB = require("./models/user.js");

app.use(cors())
app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json());

app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});


//POST /api/exercise/new-user
app.post("/api/exercise/new-user", async (req,res)=>{
  const input=req.body.username;
  if(input===""){res.json("Username is required");}
  else{
    var existed = await userDB.findOne({
      username: input
    })
    if(existed){
      res.json("This username is already taken!!!");
    }
    else{
      var newUser= new userDB({
        username: input,
        exercises:[]
      })
      await newUser.save();
      res.json({
        username: newUser.username,
        _id: newUser._id
      })
    }
  }
});

//POST /api/exercise/add
app.post("/api/exercise/add", async (req,res)=>{
  const userId= req.body.userId;
  const description= req.body.description;
  const duration= req.body.duration;
  const date= req.body.date;
  var user;
  var dateData;
  
  if(userId==="" | description==="" | duration===""){
    res.json("Please fill all required fields!")
  }
  else{
    if(date===""){dateData=new Date();}
    else{dateData= new Date(date);}

    var invalidDuration=isNaN(duration)
    if(invalidDuration){res.json("Duration input is invalid")}
    
    if(dateData && !invalidDuration){
      try{
        const pushData={
          description: description,
          duration: Number(duration),
          date: dateData
        }
        user= await userDB.findOneAndUpdate(
          {_id: userId},
          {
            $push: {
              exercises: {
                description: description,
                duration: Number(duration),
                date: dateData
              }
            }
          },
          {new:true}
        )
        res.json(
        {
          _id: user._id,
          username: user.username,
          date: pushData.date.toDateString(),
          duration: pushData.duration,
          description: pushData.description
        })
      }
      catch(err){
        res.json("ID not found")
      }
    }
  }
});

///GET api/exercise/users
app.get("/api/exercise/users",(req,res)=>{
  userDB.find({},(err,data)=>{
    if(err){console.log(err)}
    else{
      let userList= data.map(user=>{
        return {username: user.username, id:user._id}
      })
      res.send(userList)
    }
  })
})

//GET /api/exercise/log?{userId}[&from][&to][&limit]
app.get("/api/exercise/log", (req,res)=>{
  var userId= req.query.userId
  var from= req.query.from
  var to= req.query.to
  var limit= Number(req.query.limit)
  
  userDB.findById(userId,(err,user)=>{
    if(!user){res.json("User not found")}
    else{
      var list = user.exercises;
      if(from){
        list=list.filter(exercise=>exercise.date>=new Date(from))   
      }
      if(to){
        list=list.filter(exercise=>exercise.date<=new Date(to))
      }
      if(list.length > limit){
        list=list.slice(0,limit)
      }
      list=list.sort((a, b) => b.date - a.date)
      res.json({
        userId: user._id,
        username: user.username,
        from : from != null ? new Date(from).toDateString() : undefined,
        to : to != null ? new Date(to).toDateString(): undefined,
        count: list.length,
        log: list.map(e=>({
          description : e.description,
          duration : e.duration,
          date: e.date.toDateString()
        }))
      })
    }
  })
})

// Not found middleware
app.use((req, res, next) => {
  return next({status: 404, message: 'not found'})
})

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
