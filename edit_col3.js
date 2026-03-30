const fs = require('fs');
let code = fs.readFileSync('src/modules/tasks/components/TaskBoardColumn.tsx', 'utf8');

code = code.replace(
  /border: isDragOver[\s\S]*?`2px dashed \$\{accentColor\}`[\s\S]*?: '1px solid var\(--color-border\)',\s*transition: 'border-color 0\.15s ease, box-shadow 0\.15s ease',\s*backgroundColor: isDragOver[\s\S]*?`\$\{accentColor\}10`[\s\S]*?: 'var\(--color-bg-secondary\)',\s*boxShadow: isDragOver[\s\S]*?`0 0 0 3px \$\{accentColor\}30, var\(--shadow-md\)`[\s\S]*?: 'var\(--shadow-sm\)',/,
  `border: isDragOver
          ? \\\`2px dashed \${accentColor}\\\`
          : 'none',
        transition: 'background-color 0.15s ease, box-shadow 0.15s ease',
        backgroundColor: isDragOver
          ? \\\`\${accentColor}10\\\`
          : 'var(--color-bg-tertiary)',
        boxShadow: isDragOver
          ? \\\`0 0 0 2px \${accentColor}40\\\`
          : 'none',`
);

fs.writeFileSync('src/modules/tasks/components/TaskBoardColumn.tsx', code);
