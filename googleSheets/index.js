const { GoogleSpreadsheet } = require('google-spreadsheet');

async function loadGoogleSpreadsheet(id) {
  const doc = new GoogleSpreadsheet(id);
  await doc.useServiceAccountAuth({
    client_email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_SHEETS_PRIVATE_KEY.replace(/\\n/gm, '\n'),
  });
  await doc.loadInfo();
  return doc;
}

async function replaceWorksheet(worksheet, headers, rows) {
  await worksheet.clear();
  await worksheet.setHeaderRow(headers);
  await worksheet.addRows(rows);
}

async function getRows(worksheet) {
  const rows = await worksheet.getRows();
  // convert Row objects to raw JS objects
  return rows.map((row) => worksheet.headerValues.reduce((obj, key) => {
    obj[key] = row[key]; // eslint-disable-line no-param-reassign
    return obj;
  }, {}));
}

async function getCell(worksheet, rowIndex, colIndex) {
  let cell;
  try {
    cell = worksheet.getCell(rowIndex, colIndex);
  } catch (err) {
    if (err.message !== 'This cell has not been loaded yet') {
      console.log('Error getting cell at row', rowIndex, 'col', colIndex);
      throw err;
    }
    await worksheet.loadCells();
    cell = worksheet.getCell(rowIndex, colIndex);
  }
  return cell;
}

async function updateWorksheet(worksheet, uniqueKey, values, rows) {
  const _rows = rows || (await worksheet.getRows()); // eslint-disable-line no-underscore-dangle
  const matchingRow = _rows.find((row) => values[uniqueKey] === row[uniqueKey]);
  if (!matchingRow) {
    // TODO: complex values (objects with notes) aren't added properly here
    worksheet.addRow(values);
  } else {
    for (const colName in values) {
      if (String(matchingRow[colName]) === String(values[colName])) continue;

      const cell = await getCell(
        worksheet,
        matchingRow.rowIndex - 1,
        worksheet.headerValues.indexOf(colName),
      );

      if (typeof values[colName] !== 'object') {
        console.info(
          `[${values[uniqueKey]}]: update "${colName}" from "${cell.value}" to "${values[colName]}"`,
        );
        cell.value = values[colName];
      } else {
        if (values[colName].value) {
          console.info(
            `[${values[uniqueKey]}]: update "${colName}" from "${cell.value}" to "${values[colName].value}"`,
          );
          cell.value = values[colName].value;
        }
        if (values[colName].note) {
          if (!cell.note) {
            cell.note = values[colName].note;
          } else if (!cell.note.includes(values[colName].note)) {
            cell.note += `\n${values[colName].note}`;
          }
        }
      }
    }
  }
  await worksheet.saveUpdatedCells();
}

module.exports = {
  loadGoogleSpreadsheet,
  replaceWorksheet,
  getRows,
  updateWorksheet,
};
