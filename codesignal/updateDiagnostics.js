require('dotenv').config();
const {
  getCodeSignalResults,
  formatResultObject,
} = require('./helpers');
const { loadGoogleSpreadsheet } = require('../googleSheets');
const {
  PRECOURSE_COHORT_START_DATE,
  FULL_TIME_COURSE_START_DATE,
  DOC_ID_PULSE,
  DOC_ID_CESP,
} = require('../config/cohorts');

// TODO - update list of CodeSignal testIDs if needed
const mod1DiagID = 'TmxaK6kMj4WA5wah4';
const mod2DiagID = 'hxYP2PGXNYR8FLSWz';
const mod3DiagID = 'XLY9N2TuxbEkXPkqo';
const seiDiagID = 'kb3zp9cK5CYLadq22';
const cohortStartDate = new Date(PRECOURSE_COHORT_START_DATE);
const seiDiagnosticStartDate = new Date(FULL_TIME_COURSE_START_DATE);
const weekBeforeSei = seiDiagnosticStartDate.getDate() - 11;
seiDiagnosticStartDate.setDate(weekBeforeSei);

const sheetTabs = {
  [mod1DiagID]: {
    tabID: 399690295, // <- 399690295 is the googlesheets_tabId for 'CodeSignal
    once: true,
  },
  [mod2DiagID]: {
    tabID: 1733706020,
    once: true,
  },
  [mod3DiagID]: {
    tabID: 91576197,
    once: true,
  },
  [seiDiagID]: {
    tabID: 1737554240,
    once: true,
  },
  HRPTIV: {
    tabID: 1952690505,
    once: true,
    allStudents: [],
  },
  CESP: {
    tabID: 0,
    once: true,
    allStudents: [],
    studentEmails: {},
  }
};

const updatePulseDiagnostic = async (diagID, first = 0, offset = 0, seiD = false) => {
  const pulse = await loadGoogleSpreadsheet(DOC_ID_PULSE);
  const cesp = await loadGoogleSpreadsheet(DOC_ID_CESP);

  // if we want to create a new sheet, use .addSheet() + logic below
  // const resultSheet = pulse.addSheet()
  // const resultSheet = pulse.sheetsByIndex[0]; // sheetsByTitle?
  const currentSheet = pulse.sheetsById[sheetTabs[diagID].tabID];

  // only for SEI Diagnostics
  if (seiD && sheetTabs.CESP.once) {
    /* eslint-disable no-underscore-dangle */
    const cespRoster = cesp.sheetsByTitle.Roster;
    const cespRows = await cespRoster.getRows();
    const cespHeaders = cespRows[0]._sheet.headerValues;
    cespRows.forEach((row) => {
      console.log(row._rawData);
      const studentObj = {};
      row._rawData.forEach((val, i) => {
        studentObj[cespHeaders[i]] = val;
      });
      sheetTabs.CESP.allStudents.push(studentObj);
      sheetTabs.CESP.studentEmails[studentObj['SFDC Email']] = {
        name: studentObj['Full Name'],
        campus: studentObj.Campus,
        github: studentObj.GitHub,
      };
    });
    sheetTabs.CESP.once = false;
    console.log(sheetTabs.CESP.allStudents);
    console.log(sheetTabs.CESP.studentEmails);
    /* eslint-enable no-underscore-dangle */
  }

  const result = await getCodeSignalResults(diagID, first, offset);

  // format codesignal json for spreadsheet compatability
  const allDiagnosticResults = result.data.companyTest.testSessions.map((test) => (
    seiD ? formatResultObject(test, sheetTabs.CESP.studentEmails) : formatResultObject(test)
  ));

  // filter out previous cohort results
  // by cohortStartDate constant
  const currentCohortResults = allDiagnosticResults.filter((studentObj) => (
    seiD ? new Date(studentObj.startDate).getTime() >= seiDiagnosticStartDate.getTime()
      : new Date(studentObj.startDate).getTime() >= cohortStartDate.getTime()
  ));

  console.log(JSON.stringify(currentCohortResults, null, 2));

  // only if filtered array has items
  // if this condition doesn't run, there are no recent results
  if (currentCohortResults.length) {
    try {
      // get headers for sheets -> email / fullName / githubHandle / ...
      const headers = Object.keys(currentCohortResults[0]);
      if (sheetTabs[diagID].once) {
        // clear the sheet to prevent dupes
        await currentSheet.clear();
        await currentSheet.setHeaderRow(headers);
        sheetTabs[diagID].once = false;
      }
      // set headers for sheet
      // write results to sheet
      await currentSheet.addRows(currentCohortResults);
      return true;
    } catch (err) {
      console.log(err);
    }
  }
  console.log('No recent results');
  return false;
};

// TODO - ...
// maybe use # of currently enrolled students?
// example case: currently housing 200 students
// pull total # of students from CESP??
// divide # of calls by 20 (max # of results)
// chain subsequent calls
// 10 total calls w/ 20 results each, totaling 200 results

const updateM1Diagnostics = async () => {
  try {
    await updatePulseDiagnostic(mod1DiagID, 20, 0, false);
    await updatePulseDiagnostic(mod1DiagID, 20, 20, false);
    await updatePulseDiagnostic(mod1DiagID, 20, 40, false);
    await updatePulseDiagnostic(mod1DiagID, 20, 60, false);
    await updatePulseDiagnostic(mod1DiagID, 20, 80, false);
    await updatePulseDiagnostic(mod1DiagID, 20, 100, false);
    await updatePulseDiagnostic(mod1DiagID, 20, 120, false);
    await updatePulseDiagnostic(mod1DiagID, 20, 140, false);
    // await updatePulseDiagnostic(mod1DiagID, 20, 160, false);
    // await updatePulseDiagnostic(mod1DiagID, 20, 180, false);
  } catch (err) {
    console.log(err);
  }
};

const updateM2Diagnostics = async () => {
  try {
    await updatePulseDiagnostic(mod2DiagID, 20, 0, false);
    await updatePulseDiagnostic(mod2DiagID, 20, 20, false);
    await updatePulseDiagnostic(mod2DiagID, 20, 40, false);
    await updatePulseDiagnostic(mod2DiagID, 20, 60, false);
    await updatePulseDiagnostic(mod2DiagID, 20, 80, false);
    await updatePulseDiagnostic(mod2DiagID, 20, 100, false);
    await updatePulseDiagnostic(mod2DiagID, 20, 120, false);
    await updatePulseDiagnostic(mod2DiagID, 20, 140, false);
    // await updatePulseDiagnostic(mod2DiagID, 20, 160, false);
    // await updatePulseDiagnostic(mod2DiagID, 20, 180, false);
  } catch (err) {
    console.log(err);
  }
};

const updateM3Diagnostics = async () => {
  try {
    // await updatePulseDiagnostic(mod3DiagID, 0, 0, false);
    await updatePulseDiagnostic(mod3DiagID, 20, 0, false);
    await updatePulseDiagnostic(mod3DiagID, 20, 20, false);
    await updatePulseDiagnostic(mod3DiagID, 20, 40, false);
    await updatePulseDiagnostic(mod3DiagID, 20, 60, false);
    await updatePulseDiagnostic(mod3DiagID, 20, 80, false);
    await updatePulseDiagnostic(mod3DiagID, 20, 100, false);
    await updatePulseDiagnostic(mod3DiagID, 20, 120, false);
    await updatePulseDiagnostic(mod3DiagID, 20, 140, false);
    // await updatePulseDiagnostic(mod3DiagID, 20, 160, false);
    // await updatePulseDiagnostic(mod3DiagID, 20, 180, false);
  } catch (err) {
    console.log(err);
  }
};

const updateSEIDiagnostics = async () => {
  if (new Date().getTime() < seiDiagnosticStartDate.getTime()) {
    console.log('NOT TIME FOR SEI DIAGNOSTICS');
    return;
  }

  try {
    await updatePulseDiagnostic(seiDiagID, 20, 0, true);
    await updatePulseDiagnostic(seiDiagID, 20, 20, true);
    await updatePulseDiagnostic(seiDiagID, 20, 40, true);
    await updatePulseDiagnostic(seiDiagID, 20, 60, true);
    await updatePulseDiagnostic(seiDiagID, 20, 80, true);
    await updatePulseDiagnostic(seiDiagID, 20, 100, true);
    await updatePulseDiagnostic(seiDiagID, 20, 120, true);
    await updatePulseDiagnostic(seiDiagID, 20, 140, true);
    // await updatePulseDiagnostic(seiDiagID, 20, 160, true);
    // await updatePulseDiagnostic(seiDiagID, 20, 180, true);
  } catch (err) {
    console.log(err);
  }
};

const updateAllDiagnostics = async () => {
  console.log('MODULE 1 DIAGNOSTICS');
  updateM1Diagnostics()
    .then(() => {
      console.log('MODULE 1 COMPLETE');
      console.log('MODULE 2 DIAGNOSTICS');
      updateM2Diagnostics();
    })
    .then(() => {
      console.log('MODULE 2 COMPLETE');
      console.log('MODULE 3 DIAGNOSTICS');
      updateM3Diagnostics();
    })
    .then(() => {
      console.log('MODULE 3 COMPLETE');
      console.log('SEI DIAGNOSTICS');
      updateSEIDiagnostics();
    })
    .catch((err) => {
      console.log('Uh Oh');
      console.log(err);
    });
};

// updateM2Diagnostics();

// updateM3Diagnostics();

// updateSEIDiagnostics();

updateAllDiagnostics();
