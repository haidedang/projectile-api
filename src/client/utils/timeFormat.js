function zeroPad(number, size = 2) {
  let s = String(number);
  while (s.length < size) {
    s = '0' + s;
  }
  return s;
}

// Convert time from miliseconds int to hh:mm:ss.S string
export default function timeFormat(miliseconds) {
  let remaining = miliseconds / 1000;

  const hh = parseInt(remaining / 3600, 10);

  remaining %= 3600;

  const mm = parseInt(remaining / 60, 10);
  const ss = parseInt(remaining % 60, 10);
  const S = parseInt((miliseconds % 1000) / 100, 10);

  return `${zeroPad(hh)}:${zeroPad(mm)}:${zeroPad(ss)}.${S}`;
}

export function normalizeDuration(time) {
  time = time.toString();
  if (time.includes(':')) {
    const tmp = time.split(':');
    let tmp2 = parseFloat('0.' + tmp[1]) * (100 / 60);
    tmp2 = tmp2.toString();
    const tmp3 = tmp2.split('.')[1];
    time = tmp[0] + (tmp3 ? '.' + tmp3 : '');
  } else if (time.includes(',')) {
    time = time.replace(',', '.');
  }
  return parseFloat(time);
}
