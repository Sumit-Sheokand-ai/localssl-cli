const readline = require('readline');

async function askYesNo(question, defaultNo = true) {
  if (process.env.LOCALSSL_ASSUME_YES === '1') {
    return true;
  }

  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    return !defaultNo;
  }

  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (answer) => {
      rl.close();
      const normalized = String(answer || '').trim().toLowerCase();
      resolve(normalized === 'y' || normalized === 'yes');
    });
  });
}

module.exports = { askYesNo };
