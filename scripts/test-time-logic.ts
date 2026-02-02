function getPeriod(hour: number) {
  // Simulate the logic in cron routes
  return (hour >= 5 && hour <= 11) ? 'morning' : 'evening';
}

console.log('Taipei 08:00 (Hour 8) ->', getPeriod(8));
console.log('Taipei 18:00 (Hour 18) ->', getPeriod(18));
console.log('Taipei 23:00 (Hour 23) ->', getPeriod(23));
console.log('Taipei 02:00 (Hour 2) ->', getPeriod(2));

const now = new Date();
const taipeiTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
const hours = taipeiTime.getUTCHours();
console.log('Current Taipei Hour:', hours);
console.log('Current Period:', getPeriod(hours));
