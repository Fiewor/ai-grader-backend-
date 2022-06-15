const ComputerVisionClient =
  require("@azure/cognitiveservices-computervision").ComputerVisionClient;
const {
  TextAnalyticsClient,
  AzureKeyCredential,
} = require("@azure/ai-text-analytics");
const key = process.env.API_KEY;
const endpoint = process.env.API_ENDPOINT;
const text_key = process.env.TEXT_KEY;
const text_endpoint = process.env.TEXT_ENDPOINT;
const textAnalyticsClient = new TextAnalyticsClient(
  text_endpoint,
  new AzureKeyCredential(text_key)
);
const ApiKeyCredentials = require("@azure/ms-rest-js").ApiKeyCredentials;
const computerVisionClient = new ComputerVisionClient(
  new ApiKeyCredentials({ inHeader: { "Ocp-Apim-Subscription-Key": key } }),
  endpoint
);
const fs = require("fs");
const fsPromises = fs.promises;
const path = require("path");
const createReadStream = fs.createReadStream;
const sleep = require("util").promisify(setTimeout);

// function to extract identifiable text from image. takes image path as argument
const getTextFromImage = async (imagePath) => {
  const STATUS_SUCCEEDED = "succeeded";
  const STATUS_FAILED = "failed";
  let textArray = [],
    completeText;
  // console.log(`Reading local image for text in ...${path.basename(imagePath)}`);

  const streamResponse = await computerVisionClient
    .read(imagePath)
    .then((response) => response)
    .catch((err) => console.error(err));

  // Get operation location from response, so you can get the operation ID.
  const operationLocation = streamResponse.operationLocation;
  // Get the operation ID at the end of the URL
  const operationId = operationLocation.substring(
    operationLocation.lastIndexOf("/") + 1
  );
  // Wait for the read operation to finish, use the operationId to get the result.
  while (true) {
    const readOpResult = await computerVisionClient
      .getReadResult(operationId)
      .then((result) => result);
    console.log(`Read status: ${readOpResult.status}`);

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
        if (textRecResult.lines.length) {
          for (const line of textRecResult.lines) {
            // ! TO-DO: plug in join logic here
            textArray.push(line.text);
          }
          completeText = textArray.join(" ");
          console.log(completeText);
        } else {
          console.log("No recognized text.");
        }
      }
      break;
    }
    await sleep(1000);
  }
  return textArray;
};

// function to extract key phrases from provided text string
const keyPhraseExtraction = async (keyPhrasesInput) => {
  let extracted = [];

  try {
    const keyPhraseResult = await textAnalyticsClient.extractKeyPhrases(
      keyPhrasesInput
    );

    if (keyPhraseResult.length === 0) {
      console.log("Unable to extract key phrases");
      throw new Error("Unable to extract key phrases");
    } else {
      for (const document of keyPhraseResult) {
        // console.log(`ID: ${document.id}`);
        // console.log(`\tDocument Key Phrases: ${document.keyPhrases}`);
        extracted.push(document.keyPhrases);
      }
    }
  } catch (e) {
    console.log(e);
  }
  return extracted;
};

// const readOperation = async (path) => {
//   let files;
//   try {
//     files = await fsPromises.readdir(path);
//   } catch (err) {
//     console.log(err);
//     throw err;
//   }
//   return Promise.all(
//     files.map(async (file) => {
//       try {
//         const results = await getTextFromImage(file);
//         return results;
//       } catch (err) {
//         console.error(err);
//         // throw err;
//       }
//     })
//   );
// };

module.exports = {
  getTextFromImage,
  keyPhraseExtraction,
  // readOperation,
};
