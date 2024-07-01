const { rm } = require('fs/promises');
const { join } = require('path');

rm(join(__dirname, '../dist'), {
  force: true,
  recursive: true,
})
  .then(() => console.log('Dist Cleared!'))
  .catch(() => console.log('No Dist to Clear!'));
