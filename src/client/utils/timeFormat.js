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
  if (time.includes(':')) {
    const tmp = time.split(':');
    const tmp2 = (parseInt(tmp[1]) / 60) * 100;
    time = tmp[0] + '.' + tmp2;
  } else if (time.includes(',')) {
    time = time.replace(',', '.');
  }
  return time;
}
