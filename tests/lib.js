// Paths for the tests: the game as it is developed (index.html) and as it is shipped (dist/polinusa.html)
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
module.exports = {ROOT, PAGE:'file://' + path.join(ROOT, process.env.POLINUSA_BUNDLE ? 'dist/polinusa.html' : 'index.html'), BUNDLE:'file://' + path.join(ROOT, 'dist', 'polinusa.html')};
