const fs = require('fs');
let code = fs.readFileSync('src/modules/tasks/components/TaskBoardColumn.tsx', 'utf8');

code = code.replace(
  /border: '1px solid var\(--color-border\)',\s*transition: 'border-color 0\.15s ease, box-shadow 0\.15s ease',\s*backgroundColor: isDragOver\s*\?\s*`\$\{accentColor\}10`\s*:\s*'var\(--color-bg-secondary\)',\s*boxShadow: isDragOver\s*\?\s*`0 0 0 3px \$\{accentColor\}30, var\(--shadow-md\)`\s*:\s*'var\(--shadow-sm\)',/,
  `border: 'none',
        transition: 'background-color 0.15s ease, box-shadow 0.15s ease',
        backgroundColor: isDragOver
          ? \`\${accentColor}10\`
          : 'var(--color-bg-tertiary)',
        boxShadow: isDragOver
          ? \`0 0 0 2px \${accentColor}40\`
          : 'none',`
);

fs.writeFileSync('src/modules/tasks/components/TaskBoardColumn.tsx', code);
