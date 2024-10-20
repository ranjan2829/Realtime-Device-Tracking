const express=require("express");
const app=express();
app.get("/",function(req,res){
      res.send("HEY")
});
app.listen(3000);