module.exports = {
  /**
   * The following constants MUST be updated each round
   */
  COHORT_ID: 'seip2303',
  PRECOURSE_COHORT_START_DATE: '2023-02-06',
  FULL_TIME_COURSE_START_DATE: '2023-03-27',
  DEADLINE_DATES: {
    W1: ['2/22/2023', '3/1/2023', '3/8/2023'],
    W2: ['3/1/2023', '3/8/2023', '3/15/2023'],
    W3: ['3/8/2023', '3/15/2023', '3/19/2023'],
    W4: ['3/13/2023', '3/17/2023', '3/19/2023'],
    Final: ['3/13/2023', '3/17/2023', '3/19/2023'],
  },
  LEARN_COHORT_ID: '3654',
  GITHUB_STUDENT_TEAM: 'students-seip2303',
  DOC_ID_PULSE: '1No5KCkrr-sEjYOIuKFC_Y66fxhH8iOEqHbwFeBivBxA',
  DOC_ID_CESP: '1RqZnNYyRcpc-oJ-E70Um_LYXb1B1m-scCvgcENWEFuw',
  SHEET_ID_HRPTIV_ROSTER: '1872934203', // gid for each round's roster worksheet
  SLACK_WORKSPACE: 'seiopr', // valid values: hrseip (precourse), seiopr (precourse 2)

  // Update these as changes are made to the assignment test suites (for repo completion formulas)
  TEST_COUNT_KOANS: 26,
  TEST_COUNT_TESTBUILDER_MIN: 3323,
  TEST_COUNT_TESTBUILDER_MAX: 3329,
  TEST_COUNT_UNDERBAR_PART_ONE: 65,
  TEST_COUNT_UNDERBAR_PART_TWO: 67,
  TEST_COUNT_TWIDDLER: 52,
  TEST_COUNT_RECURSION: 2,

  /**
   * The rest of the constants do NOT need to be updated each round
   */

  /* Learn */
  LEARN_API_COHORTS: 'https://learn-2.galvanize.com/api/v1/cohorts/',

  /* GitHub */
  GITHUB_ORG_NAME: 'hackreactor',

  /* Google Sheets */
  DOC_ID_HRPTIV: '1CZTeyLgVP70DtU33RkbqlvbGSyYCkgxYxp4PaiPUtVo',
  SHEET_ID_HRPTIV_NAUGHTY_LIST: '866788940',
  // the following gid only needs updated if CES&P is not _duplicated_
  // (duplicating a sheet preserves the individual worksheet gids)
  SHEET_ID_CESP_MODULE_COMPLETION: '1744886664',
  SHEET_ID_CESP_ROSTER: '0',

  /* Slack */
  SLACK_TM_EMAILS: [
    'beverly.hernandez@galvanize.com',
    'daniel.rouse@galvanize.com',
    'eliza.drinker@galvanize.com',
    'steven.chung@galvanize.com',
    'david.coleman@galvanize.com',
  ],
  SLACK_JOIN_URL_STUB_HRSEIP: 'join.slack.com/t/hrseip/shared_invite/zt-u5go0u3k-9H_2XJZLp8JwSfvyhMNeRQ',
  SLACK_JOIN_URL_STUB_SEIOPR: 'join.slack.com/t/sei-opr/shared_invite/zt-1713wh5hc-vYsb9ut7gKri6CcGGJS~nQ',

  /* Salesforce */
  SFDC_OPPTY_RECORD_ID: '012j0000000qVAP',
  SFDC_FULL_TIME_COURSE_TYPE: '12 Week',
  SFDC_SELECT_QUERY: [
    'Id',
    'Student__c',
    'Student__r.Name',
    'Student__r.Email',
    'Student__r.Secondary_Email__c',
    'Campus_Formatted__c',
    'Student__r.Github_Username__c',
    'Course_Start_Date_Actual__c',
    'Product_Code__c',
    'StageName',
    'Separation_Status__c',
    'Separation_Type__c',
    'Separation_Reason__c',
    'Last_Day_Of_Attendance__c',
    'Last_Day_of_Attendance_Acronym__c',
    'Official_Withdrawal_Date__c',
    'Separation_Notes__c',
    'Student__r.Preferred_First_Name__c',
    'Full_Primary_Name__c',
    'Student__r.Birthdate',
    'Student__r.Phone',
    'Student__r.MailingAddress',
    'Student__r.Emergency_Contact_Name__c',
    'Student__r.Emergency_Contact_Phone__c',
    'Student__r.Emergency_Contact_Relationship__c',
    'Student__r.Tshirt_Size__c',
    'Student__r.T_Shirt_Fit__c',
    'Student__r.Highest_Degree__c',
    'Student__r.Race__c',
    'Student__r.EthnicityNew__c',
    'Student__r.Identify_as_LGBTQ__c',
    'Student__r.US_Veteran__c',
    'Student__r.Dependent_of_Veteran__c',
    'Student__r.US_Citizen_or_Permanent_Resident__c',
    'Student__r.Hoodie_Size__c',
    'Student__r.Address_While_in_School__c',
    'Student__r.Allergies__c',
    'Student__r.OtherAddress',
    'Student__r.Student_Funding_1__c',
    'Student__r.Student_Funding_1_Stage__c',
    'Payment_Option__c',
    'Student__r.Name_Pronunciation__c',
    'Student__r.Pronouns__c',
    'Student__r.Operating_System__c',
    'Student__r.Public_Birthday__c',
    'Student__r.Obligations_During_Course__c',
    'Student__r.Strengths__c',
    'Student__r.Other_Bootcamps_Applied_To__c',
    'Student__r.First_Choice_Bootcamp__c',
    'Student__r.Why_Hack_Reactor__c',
    'Student__r.Fun_Fact__c',
    'Student__r.Previous_Payment_Type__c',
    'Student__r.Self_Reported_Preparation__c',
    'Student__r.Alumni_Stage__c',
    'Student__r.Salary_prior_to_program__c',
    'Student__r.LinkedIn_Username__c',
    'Student__r.Age_at_Start__c',
    'Student__r.Student_Onboarding_Form_Completed_On__c',
  ].join(', '),
};
