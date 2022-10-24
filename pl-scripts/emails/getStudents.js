import { loadGoogleSpreadsheet } from '../../googleSheets';
import techMentors from '../../tech-mentors';
import {
  DOC_ID_HRPTIV,
  DOC_ID_PULSE,
  SHEET_ID_HRPTIV_ROSTER,
} from '../../constants';

let rosterStudents;
export async function getRosterStudents() {
  if (!rosterStudents) {
    const sheetHRPTIV = await loadGoogleSpreadsheet(DOC_ID_HRPTIV);
    rosterStudents = await sheetHRPTIV.sheetsById[SHEET_ID_HRPTIV_ROSTER].getRows();
  }
  return rosterStudents;
}

let repoCompletionStudents;
export async function getRepoCompletionStudents() {
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
