const { loadGoogleSpreadsheet } = require('../../googleSheets');
const techMentors = require('../../tech-mentors');
const {
  DOC_ID_HRPTIV,
  DOC_ID_PULSE,
  SHEET_ID_HRPTIV_ROSTER,
} = require('../../constants');

let rosterStudents;
async function getRosterStudents() {
  if (!rosterStudents) {
    const sheetHRPTIV = await loadGoogleSpreadsheet(DOC_ID_HRPTIV);
    rosterStudents = await sheetHRPTIV.sheetsById[SHEET_ID_HRPTIV_ROSTER].getRows();
  }
  return rosterStudents;
}

let repoCompletionStudents;
async function getRepoCompletionStudents() {
  if (!repoCompletionStudents) {
    const doc = await loadGoogleSpreadsheet(DOC_ID_PULSE);
    const sheets = await Promise.all(
      techMentors.map(async (techMentor) => {
        const sheetID = techMentor.repoCompletionSheetID;
        const sheet = doc.sheetsById[sheetID];
        const rows = await sheet.getRows();
        return rows.filter((row) => row.githubHandle);
      }),
    );
    repoCompletionStudents = sheets.flat();
  }
  return repoCompletionStudents;
}

module.exports = {
  getRosterStudents,
  getRepoCompletionStudents,
};
