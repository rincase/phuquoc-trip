const SPREADSHEET_ID = '1JO2PLBntD7HPVfDmDpuxUUyAmCHT1M-tNFGVxf20DFo';

function doGet(e) {
  try {
    const action = String((e && e.parameter && e.parameter.action) || 'getAll');
    if (action === 'getAll') return json_({ ok: true, data: getAllData_() });
    if (action === 'ping') return json_({ ok: true, message: 'pong', time: new Date().toISOString() });
    return json_({ ok: false, error: 'Unknown action' });
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

function doPost(e) {
  try {
    const p = (e && e.parameter) || {};
    const action = String(p.action || '');
    if (action === 'updateChecklist') {
      const result = updateChecklist_(String(p.id || ''), parseBool_(p.checked), String(p.updatedBy || ''));
      return json_({ ok: true, ...result });
    }
    return json_({ ok: false, error: 'Unknown action' });
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

function getAllData_() {
  const settingsRows = rows_('settings');
  const settings = {};
  settingsRows.forEach(r => { if (r.key) settings[r.key] = r.value; });

  return {
    trip: {
      name: settings.tripName || '富國島家庭旅遊',
      destination: settings.destination || 'Phu Quoc',
      startDate: isoDate_(settings.startDate),
      endDate: isoDate_(settings.endDate),
      days: num_(settings.days),
      nights: num_(settings.nights),
      currency: settings.currency || 'VND',
      timezone: settings.timezone || 'Asia/Ho_Chi_Minh'
    },
    itinerary: rows_('itinerary').map(r => ({
      id: r.id,
      day: num_(r.day),
      date: isoDate_(r.date),
      start: time_(r.startTime),
      end: time_(r.endTime),
      title: r.title || '',
      detail: r.detail || '',
      area: r.area || '',
      hotel: r.hotel || '',
      category: r.category || '',
      sort: num_(r.sort)
    })),
    checklist: rows_('checklist').map(r => ({
      id: r.id,
      type: r.type || '',
      item: r.item || '',
      checked: parseBool_(r.checked),
      assignedTo: r.assignedTo || '',
      updatedBy: r.updatedBy || '',
      updatedAt: r.updatedAt || '',
      sort: num_(r.sort)
    })),
    hotels: rows_('hotels').map(r => ({
      id: r.id,
      name: r.name || '',
      checkIn: isoDate_(r.checkIn),
      checkOut: isoDate_(r.checkOut),
      area: r.area || '',
      address: r.address || '',
      phone: r.phone || '',
      mapUrl: r.mapUrl || '',
      bookingNote: r.bookingNote || '',
      note: r.note || ''
    })),
    places: rows_('places').map(r => ({
      id: r.id,
      name: r.name || '',
      area: r.area || '',
      category: r.category || '',
      lat: numOrBlank_(r.latitude),
      lng: numOrBlank_(r.longitude),
      mapUrl: r.mapUrl || '',
      mapQuery: r.name || '',
      note: r.note || '',
      sort: num_(r.sort)
    })),
    notes: rows_('notes').map(r => ({
      id: r.id,
      date: isoDate_(r.date),
      category: r.category || '',
      content: r.content || '',
      sort: num_(r.sort)
    })),
    emergencyContacts: rows_('emergency_contacts').map(r => ({
      id: r.id,
      type: r.type || '',
      label: r.label || '',
      description: r.description || '',
      phone: r.phone || '',
      action: r.action || 'tel',
      enabled: parseBool_(r.enabled),
      sort: num_(r.sort)
    })),
    driverInfo: rows_('driver_info').map(r => ({
      id: r.id,
      label: r.label || '',
      driverName: r.driverName || '',
      phone: r.phone || '',
      whatsapp: r.whatsapp || '',
      line: r.line || '',
      vehicle: r.vehicle || '',
      serviceStart: isoDate_(r.serviceStart),
      serviceEnd: isoDate_(r.serviceEnd),
      pickupInfo: r.pickupInfo || '',
      note: r.note || '',
      enabled: parseBool_(r.enabled),
      sort: num_(r.sort)
    }))
  };
}

function updateChecklist_(id, checked, updatedBy) {
  if (!id) throw new Error('Missing checklist id');
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sh = ss.getSheetByName('checklist');
  if (!sh) throw new Error('Sheet checklist not found');
  const values = sh.getDataRange().getDisplayValues();
  if (!values.length) throw new Error('Checklist is empty');
  const headers = values[0];
  const idCol = headers.indexOf('id');
  const checkedCol = headers.indexOf('checked');
  const updatedByCol = headers.indexOf('updatedBy');
  const updatedAtCol = headers.indexOf('updatedAt');
  if (idCol < 0 || checkedCol < 0) throw new Error('Checklist columns missing');

  let rowIndex = -1;
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][idCol]).trim() === id) { rowIndex = i + 1; break; }
  }
  if (rowIndex < 0) throw new Error('Checklist item not found: ' + id);

  const now = Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyy-MM-dd HH:mm:ss');
  sh.getRange(rowIndex, checkedCol + 1).setValue(checked);
  if (updatedByCol >= 0) sh.getRange(rowIndex, updatedByCol + 1).setValue(updatedBy);
  if (updatedAtCol >= 0) sh.getRange(rowIndex, updatedAtCol + 1).setValue(now);
  SpreadsheetApp.flush();
  return { id, checked, updatedBy, updatedAt: now };
}

function rows_(sheetName) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sh = ss.getSheetByName(sheetName);
  if (!sh) return [];
  const values = sh.getDataRange().getDisplayValues();
  if (!values.length) return [];
  const headers = values[0].map(h => String(h).trim());
  return values.slice(1)
    .filter(row => row.some(v => String(v).trim() !== ''))
    .map(row => {
      const obj = {};
      headers.forEach((h, i) => { obj[h] = row[i] == null ? '' : String(row[i]).trim(); });
      return obj;
    });
}

function isoDate_(value) {
  const s = String(value || '').trim();
  const m = s.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})$/);
  if (!m) return s;
  return `${m[1]}-${String(m[2]).padStart(2,'0')}-${String(m[3]).padStart(2,'0')}`;
}

function time_(value) {
  const s = String(value || '').trim();
  const m = s.match(/^(\d{1,2}):(\d{2})/);
  return m ? `${String(m[1]).padStart(2,'0')}:${m[2]}` : s;
}

function num_(value) {
  const n = Number(String(value || '').replace(/,/g,''));
  return Number.isFinite(n) ? n : 0;
}

function numOrBlank_(value) {
  const s = String(value || '').trim();
  if (!s) return '';
  const n = Number(s);
  return Number.isFinite(n) ? n : '';
}

function parseBool_(value) {
  if (typeof value === 'boolean') return value;
  return /^(true|1|yes|y)$/i.test(String(value || '').trim());
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
