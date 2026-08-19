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

walkDir('d:/Pictures - Copy/Desktop/New folder (5)/Remindo/Remindo/frontend/src/app/components', function(filePath) {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;

    // Replace heavy dark borders with transparent or hairline borders + shadow
    content = content.replace(/dark:border-\[\#333\]/g, 'dark:border-white/[0.04] dark:shadow-[0_2px_8px_rgba(0,0,0,0.5)]');
    content = content.replace(/dark:border-\[\#292929\]/g, 'dark:border-white/[0.04] dark:shadow-[0_2px_8px_rgba(0,0,0,0.5)]');
    content = content.replace(/dark:border-white\/5/g, 'dark:border-white/[0.04] dark:shadow-[0_2px_8px_rgba(0,0,0,0.5)]');
    
    // Smooth out hover borders on lists/cards
    content = content.replace(/dark:hover:border-gray-700/g, 'dark:hover:border-transparent dark:hover:bg-[#111]');

    // For cards (elements with rounded corners and bg-black), change bg-black to bg-[#0a0a0a]
    // We match className="... rounded-... dark:bg-black ..."
    // A simpler way is to replace dark:bg-black inside a className string IF that string also contains "rounded" or "shadow" or "border".
    // Let's use a regex that finds className="..." and checks its contents.
    content = content.replace(/className=(['"])(.*?)\1/g, (match, quote, classStr) => {
      let newClassStr = classStr;
      
      // If it's a card/container (has rounded corners, border, or shadow)
      if (/rounded-|border-|shadow-/.test(newClassStr) && newClassStr.includes('dark:bg-black')) {
        // Exclude the very main backgrounds if they exist (usually full screen, no rounded corners, but just to be safe)
        if (!newClassStr.includes('min-h-screen')) {
           newClassStr = newClassStr.replace(/dark:bg-black/g, 'dark:bg-[#0a0a0a]');
        }
      }

      // If it's an icon button container (often p-2, rounded, border)
      // We remove the border to make it less boxy
      if (/p-[123]/.test(newClassStr) && /rounded-/.test(newClassStr) && /border/.test(newClassStr) && !newClassStr.includes('w-full')) {
          // If it's a small icon button, make the border transparent in dark mode
          newClassStr = newClassStr.replace(/dark:border-white\/\[0\.04\]/g, 'dark:border-transparent');
          newClassStr = newClassStr.replace(/dark:border-gray-\d00/g, 'dark:border-transparent');
      }

      if (newClassStr !== classStr) {
        return `className=${quote}${newClassStr}${quote}`;
      }
      return match;
    });

    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      modifiedFiles.push(filePath);
    }
  }
});

console.log("MODIFIED_FILES_LIST:");
console.log(modifiedFiles.join('\n'));
