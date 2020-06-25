const mongoose=require("mongoose");
const userSchema=new mongoose.Schema(
  {
    username:{type:String, required: true},
    exercises:[
      {
        description: String,
        duration: Number,
        date: Date
      }
    ]
  }
);
const USER=mongoose.model("username",userSchema);
module.exports = USER;
