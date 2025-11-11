const fs = require('fs');
const path = require('path');

// Read the source file
const source = fs.readFileSync(path.join(__dirname, 'msglog.js'), 'utf8');

// Create dist directory if it doesn't exist
const distDir = path.join(__dirname, 'dist');
if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir);
}

// Wrap the plugin in an IIFE (Immediately Invoked Function Expression)
const wrapped = `(function() {
${source}
})();`;

// Write to dist folder
fs.writeFileSync(path.join(distDir, 'MessageSniffer.js'), wrapped, 'utf8');

console.log('✓ Build complete! Output: dist/MessageSniffer.js');
