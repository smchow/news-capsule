

// Dependencies
var express = require("express");
var bodyParser = require("body-parser");
//var logger = require("morgan");
var mongoose = require("mongoose");
// Requiring our Comm and Article models
var Comm = require("./models/Comm.js");
var Article = require("./models/Article.js");
// Our scraping tools
var request = require("request");
var cheerio = require("cheerio");
// Set mongoose to leverage built in JavaScript ES6 Promises
mongoose.Promise = Promise;
var PORT = process.env.PORT||3000;


// Initialize Express
var app = express();

// Use morgan and body parser with our app
//app.use(logger("dev"));
app.use(bodyParser.urlencoded({
  extended: false
}));

// Make public a static dir
app.use(express.static("public"));


// Database configuration with mongoose
mongoose.connect("mongodb://heroku_r6n8lmc1:ej34q1tmu5rnsvs28cc25upuu5@ds155160.mlab.com:55160/heroku_r6n8lmc1");
//mongoose.connect("mongodb://localhost/newsmoduledb");
var db = mongoose.connection;

// Show any mongoose errors
db.on("error", function(error) {
  console.log("Mongoose Error: ", error);
});

// Once logged in to the db through mongoose, log a success message
db.once("open", function() {
  console.log("Mongoose connection successful.");
});


// Routes
// ======

// A GET request to scrape the website
app.get("/scrape", function(req, res) {
  // getting  body of the html with request
  request("http://www.reuters.com/news/entertainment", function(error, response, html) {
    var $ = cheerio.load(html);
    // Now, we grab every h2 within an article tag, and do the following:
    console.log("Here");
    $(".feature h2").each(function(i, element) {

      // Save an empty result object
      var result = {};
      console.log(i);//($(this));

      // Add the text and href of every link, and save them as properties of the result object
      result.title = $(this).children("a").text();
      result.link = $(this).children("a").attr("href");

      var entry = new Article(result);

      // Now, save that entry to the db
      entry.save(function(err, doc) {
        if (err) {
          console.log(err);
        }
        else {
          console.log(doc);
        }
      });

    });
  });
  res.send("Scrape Complete");
});

// This will get the articles we scraped from the mongoDB
app.get("/articles", function(req, res) {
  // Grab every doc in the Articles array
  Article.find({}, function(error, doc) {
    // Log any errors
    if (error) {
      console.log(error);
    }
    // Or send the doc to the browser as a json object
    else {
      res.json(doc);
    }
  });
});

// Grab an article by it's ObjectId
app.get("/articles/:id", function(req, res) {
  Article.findOne({ "_id": req.params.id })
  // populate all of the comments associated with it
  .populate("comm")
  // now, execute our query
  .exec(function(error, doc) {
    if (error) {
      console.log(error);
    }
    // Otherwise, send the doc to the browser as a json object
    else {
      res.json(doc);
    }
  });
});


// Create a new comment or replace an existing comment
app.post("/articles/:id", function(req, res) {
  // Create a new comment and pass the req.body to the entry
  var newComm = new Comm(req.body);

  // And save the new comment to the db
  newComm.save(function(error, doc) {
    // Log any errors
    if (error) {
      console.log(error);
    }
    else {
      // Use the article id to find and update it's comment
      Article.findOneAndUpdate({ "_id": req.params.id }, { "comm": doc._id })
      // Execute the above query
      .exec(function(err, doc) {
        if (err) {
          console.log(err);
        }
        else {
          // Or send the document to the browser
          res.send(doc);
        }
      });
    }
  });
});


// Listen on port 3000
app.listen(PORT, function() {
  console.log("App running on port " + PORT);
});

    

