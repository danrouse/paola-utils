const { loadGoogleSpreadsheet } = require('../../googleSheets');
const techMentors = require('../../config/techMentors');
const { DOC_ID_PULSE } = require('../../config/cohorts');

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
  getRepoCompletionStudents,
};
