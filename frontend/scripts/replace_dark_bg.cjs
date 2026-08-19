const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

let modifiedFiles = [];

walkDir('d:/Pictures - Copy/Desktop/New folder (5)/Remindo/Remindo/frontend/src', function(filePath) {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;

    // Regex to match dark mode background classes
    // e.g. dark:bg-gray-800, dark:hover:bg-[#333], dark:data-[state=checked]:bg-primary
    // We want to replace the `bg-...` part with `bg-black`
    const regex = /(dark:(?:[a-zA-Z0-9_\-\[\]=]+:)*)bg-[a-zA-Z0-9_/#\-\[\]\.%]+/g;
    
    content = content.replace(regex, (match, prefix) => {
      // If it's already bg-black or bg-[#000000], skip
      if (match.endsWith('bg-black') || match.endsWith('bg-[#000000]') || match.endsWith('bg-[#000]')) {
        return match;
      }
      return prefix + 'bg-black';
    });

    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      modifiedFiles.push(filePath);
    }
  }
});

console.log("MODIFIED_FILES_LIST:");
console.log(modifiedFiles.join('\n'));
