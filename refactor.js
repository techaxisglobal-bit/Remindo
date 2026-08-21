const fs = require('fs');
const path = require('path');

function replaceFetch(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      replaceFetch(fullPath);
    } else if (fullPath.endsWith('.tsx') && !fullPath.includes('SignIn.tsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      let changed = false;
      
      if (content.match(/[^a-zA-Z0-9_]fetch\(/)) {
          if (!content.includes('fetchWithAuth')) {
             content = 'import { fetchWithAuth } from "../../utils/apiClient";\n' + content;
          }
          content = content.replace(/([^a-zA-Z0-9_])fetch\(/g, '$1fetchWithAuth(');
          changed = true;
      }
      
      if (changed) {
        fs.writeFileSync(fullPath, content);
        console.log('Updated ' + fullPath);
      }
    }
  }
}

replaceFetch('frontend/src/app/components');
