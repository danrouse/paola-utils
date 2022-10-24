require('dotenv').config();
import jsforce from 'jsforce';
import { loadGoogleSpreadsheet } from '../googleSheets';
import {
  SFDC_OPPTY_RECORD_ID,
  SFDC_SELECT_QUERY,
  FULL_TIME_COURSE_START_DATE,
  SFDC_FULL_TIME_COURSE_TYPE,
  DOC_ID_HRPTIV,
  SHEET_ID_HRPTIV_ROSTER,
} from '../constants';

const conn = new jsforce.Connection({ loginUrl: process.env.SFDC_LOGIN_URL });
// Salesforce API Integrations
// ------------------------------

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
AND (StageName = 'Deposit Paid' OR StageName = 'Accepted'`/* OR StageName = 'Contract Out'*/ + `)`;

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

    // console.log(contact.MailingAddress)
    // console.log(contact.OtherAddress)
    // console.log(contact.Address_While_in_School__c)
    const mailingAddress = contact.MailingAddress ? formatAddress(contact.MailingAddress) : '';
    const otherAddress = contact.OtherAddress ? formatAddress(contact.OtherAddress) : '';
    const addressWhileInSchool = contact.Address_While_in_School__c || ''; /* ? formatAddress(contact.Address_While_in_School__c) : ''; */
    return {
      fullName: contact.Name,
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
      mailingAddress: mailingAddress,
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
      addressWhileInSchool: addressWhileInSchool,
      allergies: contact.Allergies__c,
      otherAddress: otherAddress,
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

export const getStudents = async (courseStart, courseType) => {
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

export const getAllStudents = () => getStudents(FULL_TIME_COURSE_START_DATE, SFDC_FULL_TIME_COURSE_TYPE);

export const getStudentsByReportID = async (reportID) => {
  try {
    await login();
    const report = conn.analytics.report(reportID);
    return await report.execute({ details: true }, (err, result) => {
      if (err) throw new Error('SALESFORCE ERROR', err);
      const { rows } = result.factMap['T!T'];
      const formattedStudents = rows.map((row) => result.reportMetadata.detailColumns
        .reduce((a, b, i) => (a[b] = row.dataCells[i].value, a), {}));
      return formattedStudents;
    });
  } catch (error) {
    return error;
  }
};

export const hasIntakeFormCompleted = (student) => student.funFact
  && student.selfReportedPrepartion && student.githubHandle;

const getEnrolledStudentSFDCContactIDs = async (docID, sheetID) => {
  const doc = await loadGoogleSpreadsheet(docID);
  const sheet = doc.sheetsById[sheetID];
  const rows = await sheet.getRows();
  return rows.map((row) => row.sfdcContactId);
};

export const getNewStudentsFromSFDC = async () => {
  const students = await getAllStudents();
  const enrolledStudentContactIDs = await getEnrolledStudentSFDCContactIDs(
    DOC_ID_HRPTIV,
    SHEET_ID_HRPTIV_ROSTER,
  );
  return students.filter((student) =>
    !enrolledStudentContactIDs.includes(student.sfdcContactId));
};
