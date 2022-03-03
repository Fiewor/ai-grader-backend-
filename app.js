"use strict";

const express = require("express");
const app = express();
const port = process.env.PORT || 3001;
const fileUpload = require("express-fileupload");

require("dotenv").config();

const fs = require("fs");
const path = require("path");
const createReadStream = fs.createReadStream;
const sleep = require("util").promisify(setTimeout);
const ComputerVisionClient =
  require("@azure/cognitiveservices-computervision").ComputerVisionClient;
const {
  TextAnalyticsClient,
  AzureKeyCredential,
} = require("@azure/ai-text-analytics");
const ApiKeyCredentials = require("@azure/ms-rest-js").ApiKeyCredentials;

const key = process.env.API_KEY;
const endpoint = process.env.API_ENDPOINT;

const text_key = process.env.TEXT_KEY;
const text_endpoint = process.env.TEXT_ENDPOINT;

const textAnalyticsClient = new TextAnalyticsClient(
  text_endpoint,
  new AzureKeyCredential(text_key)
);

const computerVisionClient = new ComputerVisionClient(
  new ApiKeyCredentials({ inHeader: { "Ocp-Apim-Subscription-Key": key } }),
  endpoint
);

// import grader from "./grading";
// import main from "./db";

let textArray = [];

app.use(fileUpload());

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  next();
});

// app.get('/', (req, res)=>{
//     res.send(`Working`);
// })

// post handler
const postHandler = async (folder) => {
  app.post(`/upload/${folder}/`, (req, res) => {
    for (let file of Object.values(req.files)) {
      let pathToFile = `${__dirname}/uploads/${folder}/` + file.name;

      file.mv(pathToFile, (err) => {
        if (err) {
          console.log("and error is ", err);
        }
      });
    }
    res.send(
      `${folder} sheet(s) uploaded successfully! Check ${folder} folder in the project's uploads directory`
    );
  });
};
postHandler(`answer`);
postHandler(`mark`);

app.listen(port, () => {
  console.log(`Server is started on port ${port}`);
});

let completeText;
// function to extract identifiable text from image. takes image path as argument
let getTextFromImage = async (imagePath) => {
  const STATUS_SUCCEEDED = "succeeded";
  const STATUS_FAILED = "failed";

  console.log(`Reading local image for text in ...${path.basename(imagePath)}`);

  const streamResponse = await computerVisionClient
    .readInStream(() => createReadStream(imagePath))
    .then((response) => response)
    .catch((err) => console.error(err));

  // Get operation location from response, so you can get the operation ID.
  const operationLocationLocal = streamResponse.operationLocation;
  console.log("operationLocationLocal", operationLocationLocal);
  // Get the operation ID at the end of the URL
  const operationIdLocal = operationLocationLocal.substring(
    operationLocationLocal.lastIndexOf("/") + 1
  );
  // Wait for the read operation to finish, use the operationId to get the result.
  while (true) {
    const readOpResult = await computerVisionClient
      .getReadResult(operationIdLocal)
      .then((result) => result);
    console.log("Read status: " + readOpResult.status);

    if (readOpResult.status === STATUS_FAILED) {
      console.log("The Read File operation has failed.");
      break;
    }
    if (readOpResult.status === STATUS_SUCCEEDED) {
      console.log("The Read File operation was a success.");
      console.log();
      console.log("Read File local image result:");
      // Print the text captured
      for (const textRecResult of readOpResult.analyzeResult.readResults) {
        for (const line of textRecResult.lines) {
          textArray.push(line.text);
        }
        completeText = textArray.join(" ");
        console.log(
          `Printing captured text from getTextFromImage function: ${completeText}`
        );
      }
      break;
    }
    await sleep(1000);
  }
  return textArray;
};

app.get(`http://localhost:3001/upload/mark`, (req, res) => {
  // read file and extract text from marking guide
  res.send(readOperation(`${__dirname}\\uploads\\mark`));
  // .then(data => console.log("result of read operation",data))
  // .catch((err) => console.log(err))
});

let extracted = [];
// function to extract key phrases from provided text string
let keyPhraseExtraction = async (client, keyPhrasesInput) => {
  try {
    const keyPhraseResult = await client.extractKeyPhrases(keyPhrasesInput);

    keyPhraseResult.forEach((document) => {
      console.log(`ID: ${document.id}`);
      console.log(`\tDocument Key Phrases: ${document.keyPhrases}`);
      extracted.push(document.keyPhrases);
    });
  } catch (e) {
    console.log(e);
  }
  return extracted;
};
let markKeyPhrase, answerKeyPhrase;
const readOperation = async (path) => {
  fs.readdir(path, (err, files) => {
    if (err) console.log(err);

    // let localPath = __dirname.replace(/\\/g, `/`);
    files.forEach((file) => {
      getTextFromImage(`${__dirname}\\uploads\\answer\\${file}`)
        .then((results) => {
          return keyPhraseExtraction(textAnalyticsClient, results);
        })
        .then((data) => {
          markKeyPhrase = data;
          // console.log(`markKeyPhrase: ${markKeyPhrase}`)
        })
        .catch((err) => console.log(err));
    });
    return markKeyPhrase;
  });
};

// read file and extract text from answer sheet
readOperation(`${__dirname}\\uploads\\answer`);
//  .......

// grading code
// grader(markKeyPhrase, answerKeyPhrase);

// db code
// main();
