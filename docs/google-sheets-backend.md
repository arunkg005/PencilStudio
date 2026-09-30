# PencilStudio Google Sheets Backend

PencilStudio can use a Google Apps Script Web App as a small task-data backend. The React app talks only to the Web App URL; it never receives a spreadsheet credential or service-account secret.

## Setup

1. Create a Google Sheet.
2. Add a sheet named `Tasks`.
3. Add these headers in row 1: `id`, `task`, `subject`, `status`, `priority`, `dueDate`.
4. Open **Extensions -> Apps Script**.
5. Paste the script below.
6. Replace `YOUR_SPREADSHEET_ID` with the spreadsheet ID from the sheet URL.
7. Deploy as **Web app**.
8. Choose the appropriate access setting for your use case.
9. Copy the deployed Web App URL.
10. Paste it into PencilStudio's configuration panel.

Google account and deployment access settings affect who can use the endpoint. Do not paste an ordinary Google Sheets URL into the app; the frontend expects the Apps Script Web App endpoint.

## Apps Script

```javascript
const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID';
const SHEET_NAME = 'Tasks';
const HEADERS = ['id', 'task', 'subject', 'status', 'priority', 'dueDate'];

function jsonOutput(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function sheet() {
  return SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
}

function rows() {
  const activeSheet = sheet();
  const values = activeSheet.getDataRange().getValues();
  return values.slice(1).filter(row => row.some(Boolean)).map(row => ({
    id: String(row[0] || ''),
    task: String(row[1] || ''),
    subject: String(row[2] || ''),
    status: String(row[3] || 'Pending'),
    priority: String(row[4] || 'Medium'),
    dueDate: String(row[5] || '')
  }));
}

function doGet(e) {
  try {
    const action = e.parameter.action || 'list';
    if (action === 'health') return jsonOutput({ success: true, message: 'Healthy', data: {} });
    if (action === 'list') return jsonOutput({ success: true, data: rows() });
    return jsonOutput({ success: false, message: 'Unknown GET action' });
  } catch (error) {
    return jsonOutput({ success: false, message: 'Could not read tasks' });
  }
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents || '{}');
    const activeSheet = sheet();
    const data = body.data || {};
    if (!body.action) return jsonOutput({ success: false, message: 'Missing action' });

    if (body.action === 'create') {
      if (!data.task || !data.subject) return jsonOutput({ success: false, message: 'Task and subject are required' });
      const id = String(new Date().getTime());
      activeSheet.appendRow([id, data.task, data.subject, data.status || 'Pending', data.priority || 'Medium', data.dueDate || '']);
      return jsonOutput({ success: true, message: 'Task created', data: { id: id } });
    }

    const values = activeSheet.getDataRange().getValues();
    const rowIndex = values.findIndex((row, index) => index > 0 && String(row[0]) === String(body.id));
    if (rowIndex < 1) return jsonOutput({ success: false, message: 'Task not found' });

    if (body.action === 'update') {
      activeSheet.getRange(rowIndex + 1, 1, 1, HEADERS.length).setValues([[
        String(body.id), data.task || '', data.subject || '', data.status || 'Pending', data.priority || 'Medium', data.dueDate || ''
      ]]);
      return jsonOutput({ success: true, message: 'Task updated', data: { id: String(body.id) } });
    }

    if (body.action === 'delete') {
      activeSheet.deleteRow(rowIndex + 1);
      return jsonOutput({ success: true, message: 'Task deleted', data: { id: String(body.id) } });
    }

    return jsonOutput({ success: false, message: 'Unknown POST action' });
  } catch (error) {
    return jsonOutput({ success: false, message: 'Could not write tasks' });
  }
}
```

## Security notes

- A public Apps Script Web App is not a private database API.
- Never put service-account credentials, OAuth secrets, or private keys in React or GitHub Pages.
- Validate and sanitize incoming data in Apps Script or a secure backend.
- For private or production data, add proper authentication and use a server-side API.
- Demo mode is safe for public deployment because it stores only local task data in the browser's `localStorage`.