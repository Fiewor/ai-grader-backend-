const { answerSheet, markSheet } = require("../dummyData");

const grader = async (doc1, doc2) => {
  console.log("doc1", doc1);
  let totalScore = 0;
  let totalPointsAwardable = 0;

  for (const block1 of doc1.page) {
    for (const block2 of doc2.page) {
      // check that id is the same
      // so, keyPhrase for question 1 is only compared with keyPhrase for answer 1
      if (block1.id === block2.id) {
        let grade = 0;
        let pointsAwardable = block2.phrases.length;
        totalPointsAwardable += +block2.phrases.length;
        // let pointsAwardable = points;
        // replace pointsAwardable with points specified in marking guide
        // in format: "Points Awardable: 5"
        // passed in as an arg to the grader function
        block1.phrases.forEach((blockphrase1) => {
          block1.phrases.forEach((block2phrase) => {
            if (blockphrase1 === block2phrase) {
              grade += 1;
              totalScore += 1;
            }
          });
        });

        console.log(
          `Score for question ${block1.id}: ${grade}/${pointsAwardable}`
        );
      }
    }
  }
  console.log(
    `Total score attained in this page: ${totalScore}/${totalPointsAwardable}`
  );
  return { totalScore, totalPointsAwardable };
};

module.exports = grader;