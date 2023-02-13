require('dotenv').config();
const { format } = require('date-fns');
const jsforce = require('jsforce');
const { loadGoogleSpreadsheet } = require('../googleSheets');
const {
  SFDC_SELECT_QUERY,
  SFDC_FULL_TIME_COURSE_TYPE,
  DOC_ID_HRPTIV,
} = require('../config');
const {
  SHEET_ID_HRPTIV_ROSTER,
  FULL_TIME_COURSE_START_DATE,
} = require('../config/cohorts');

const PRODUCT_CODE_CAMPUS_OVERRIDES = {
  RFP: 'RFT Pacific',
  RFE: 'RFT Eastern',
};

const conn = new jsforce.Connection({ loginUrl: process.env.SFDC_LOGIN_URL });

const login = async () => {
  try {
    return await conn.login(
      process.env.SFDC_USERNAME,
      process.env.SFDC_PASSWORD,
      (err, userInfo) => userInfo,
    );
  } catch (error) {
    return error;
  }
};

const generateWhereClause = (courseStart, courseType) => `Course_Product__c = 'Web Development'
AND Course_Start_Date_Actual__c = ${courseStart}
AND Course_Type__c LIKE '%${courseType}%'
AND (StageName = 'Deposit Paid' OR StageName = 'Accepted')`; /* OR StageName = 'Contract Out' */

const formatAddress = ({
  street,
  city,
  state,
  postalCode,
  country,
}) => `${street}\n${city}, ${state} ${postalCode}${country ? ` ${country}` : ''}`;

const formatGithubHandle = (githubHandle) => {
  if (!githubHandle) {
    return '';
  }

  const result = githubHandle.includes('github.com/') ? githubHandle.split('.com/')[1] : githubHandle;
  return result[result.length - 1] === '/' ? result.slice(0, result.length - 1) : result;
};

const formatStudents = (students) => {
  const formattedStudents = students.map((student) => {
    const contact = student.Student__r || {};

    const mailingAddress = contact.MailingAddress ? formatAddress(contact.MailingAddress) : '';
    const otherAddress = contact.OtherAddress ? formatAddress(contact.OtherAddress) : '';
    const addressWhileInSchool = contact.Address_While_in_School__c || ''; /* ? formatAddress(contact.Address_While_in_School__c) : ''; */
    return {
      fullName: student.Full_Primary_Name__c,
      // legalName: contact.Name,
      email: contact.Email,
      emailSecondary: contact.Secondary_Email__c,
      campus: student.Campus_Formatted__c,
      github: formatGithubHandle(contact.Github_Username__c),
      courseStartDate: student.Course_Start_Date_Actual__c,
      productCode: student.Product_Code__c,
      stage: student.StageName,
      separationStatus: student.Separation_Status__c,
      separationType: student.Separation_Type__c,
      separationReason: student.Separation_Reason__c,
      lastDayOfAttendance: student.Last_Day_Of_Attendance__c,
      lastDayOfAttendanceAcronym: student.Last_Day_of_Attendance_Acronym__c,
      dateOfDetermination: student.Official_Withdrawal_Date__c,
      sfdcContactId: student.Student__c,
      sfdcOpportunityId: student.Id,
      preferredFirstName: contact.Preferred_First_Name__c,
      birthday: contact.Birthdate,
      phoneNumber: contact.Phone,
      mailingAddress,
      emergencyContactName: contact.Emergency_Contact_Name__c,
      emergencyContactPhone: contact.Emergency_Contact_Phone__c,
      emergencyContactRelationship: contact.Emergency_Contact_Relationship__c,
      tshirtSize: contact.Tshirt_Size__c,
      tshirtFit: contact.T_Shirt_Fit__c,
      highestDegree: contact.Highest_Degree__c,
      gender: '',
      race: contact.Race__c,
      ethnicity: contact.EthnicityNew__c,
      identifyAsLGBTQ: contact.Identify_as_LGBTQ__c,
      isUSVeteran: contact.US_Veteran__c,
      isDependentOfUSVeteran: contact.Dependent_of_Veteran__c,
      isCitizenOrPermanentResident: contact.US_Citizen_or_Permanent_Resident__c,
      hoodieSize: contact.Hoodie_Size__c,
      addressWhileInSchool,
      allergies: contact.Allergies__c,
      otherAddress,
      studentFunding1: contact.Student_Funding_1__c,
      studentFunding1Stage: contact.Student_Funding_1_Stage__c,
      paymentOption: student.Payment_Option__c,
      namePronunciation: contact.Name_Pronunciation__c,
      pronouns: contact.Pronouns__c,
      operatingSystem: contact.Operating_System__c,
      canCelebrateBirthday: contact.Public_Birthday__c,
      obligationsDuringCourse: contact.Obligations_During_Course__c,
      strengths: contact.Strengths__c,
      otherBootcampsAppliedTo: contact.Other_Bootcamps_Applied_To__c,
      firstChoiceBootcamp: contact.First_Choice_Bootcamp__c || 'Hack Reactor',
      whyHackReactor: contact.Why_Hack_Reactor__c,
      funFact: contact.Fun_Fact__c,
      previousPaymentType: contact.Previous_Payment_Type__c,
      selfReportedPrepartion: contact.Self_Reported_Preparation__c,
      alumniStage: contact.Alumni_Stage__c,
      salaryPriorToProgram: contact.Salary_prior_to_program__c,
      linkedInUsername: contact.LinkedIn_Username__c,
      ageAtStart: contact.Age_at_Start__c,
      studentOnboardingFormCompletedOn: contact.Student_Onboarding_Form_Completed_On__c,
    };
  });
  return formattedStudents;
};

const getStudents = async (courseStart, courseType) => {
  try {
    await login();
    return await conn.sobject('Opportunity')
      .select(SFDC_SELECT_QUERY)
      .where(generateWhereClause(courseStart, courseType))
      .orderby('CreatedDate', 'DESC')
      .execute((err, res) => {
        if (err) throw new Error('SALESFORCE ERROR', err);
        const formattedStudents = formatStudents(res);
        return formattedStudents;
      });
  } catch (error) {
    return error;
  }
};

const getStudentByOpportunityId = async (id) => {
  await login();
  return new Promise((resolve, reject) => {
    try {
      conn.sobject('Opportunity')
        .retrieve(id, (err, res) => {
          if (err) throw new Error('SALESFORCE ERROR', err);
          const formattedStudents = formatStudents(res);
          resolve(formattedStudents);
        });
    } catch (err) {
      reject(err);
    }
  });
};

const getAllStudents = () => getStudents(FULL_TIME_COURSE_START_DATE, SFDC_FULL_TIME_COURSE_TYPE);

const getStudentsByReportID = async (reportID) => {
  try {
    await login();
    const report = conn.analytics.report(reportID);
    return await report.execute({ details: true }, (err, result) => {
      if (err) throw new Error('SALESFORCE ERROR', err);
      const { rows } = result.factMap['T!T'];
      const formattedStudents = rows.map((row) => result.reportMetadata.detailColumns
        .reduce((a, b, i) => (a[b] = row.dataCells[i].value, a), {})); // eslint-disable-line
      return formattedStudents;
    });
  } catch (error) {
    return error;
  }
};

const hasIntakeFormCompleted = (student) => student.funFact
  && student.selfReportedPrepartion && student.githubHandle;

const getEnrolledStudentSFDCContactIDs = async (docID, sheetID) => {
  const doc = await loadGoogleSpreadsheet(docID);
  const sheet = doc.sheetsById[sheetID];
  const rows = await sheet.getRows();
  return rows.map((row) => row.sfdcContactId);
};

const getNewStudentsFromSFDC = async () => {
  const students = await getAllStudents();
  const enrolledStudentContactIDs = await getEnrolledStudentSFDCContactIDs(
    DOC_ID_HRPTIV,
    SHEET_ID_HRPTIV_ROSTER,
  );
  return students.filter((student) => !enrolledStudentContactIDs.includes(student.sfdcContactId));
};

const formatSFDCStudentForRoster = (student) => {
  let { campus } = student;
  Object.keys(PRODUCT_CODE_CAMPUS_OVERRIDES).forEach((key) => {
    if (student.productCode.includes(key)) {
      campus = PRODUCT_CODE_CAMPUS_OVERRIDES[key];
    }
  });
  return {
    ...student,
    phoneNumber: student.phoneNumber.replace(/^\s*\+/, ''),
    campus,
    dateAddedToPrecourse: format(new Date(), 'MM/dd/yyyy'),
    secondaryEmail: student.emailSecondary,
    githubHandle: student.github,
    isUSVeteran: student.isUSVeteran ? 'Yes' : 'No',
    isDependentOfUSVeteran: student.isDependentOfUSVeteran ? 'Yes' : 'No',
    isCitizenOrPermanentResident: student.isCitizenOrPermanentResident ? 'Yes' : 'No',
    studentOnboardingFormCompletedOn: (new Date(student.studentOnboardingFormCompletedOn)).toISOString(),
  };
};

module.exports = {
  getStudents,
  getAllStudents,
  getStudentsByReportID,
  hasIntakeFormCompleted,
  getNewStudentsFromSFDC,
  getStudentByOpportunityId,
  formatSFDCStudentForRoster,
};
