const fs = require('fs');
let code = fs.readFileSync('src/modules/tasks/components/TaskBoardColumn.tsx', 'utf8');

// The original container style:
//       style={{
//         width: compactMode ? '240px' : '280px',
//         flexShrink: 0,
//         display: 'flex',
//         flexDirection: 'column',
//         borderRadius: '16px',
//         border: '1px solid var(--color-border)',
//         transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
//         backgroundColor: isDragOver
//           ? `${accentColor}10`
//           : 'var(--color-bg-secondary)',
//         boxShadow: isDragOver
//           ? `0 0 0 3px ${accentColor}30, var(--shadow-md)`
//           : 'var(--shadow-sm)',
//       }}

code = code.replace(
  /border: '1px solid var\(--color-border\)',[\s\S]*?boxShadow: isDragOver[\s\S]*?'var\(--shadow-sm\)',/,
  `border: 'none',
        transition: 'background-color 0.15s ease, box-shadow 0.15s ease',
        backgroundColor: isDragOver
          ? \`\${accentColor}10\`
          : 'rgba(0,0,0,0.02)', // A very soft frameless kanban background
        boxShadow: isDragOver
          ? \`0 0 0 2px \${accentColor}40\`
          : 'none',`
);

// The original Header style:
//         <div
//           style={{
//             flexShrink: 0,
//             borderBottom: '1px solid var(--color-border)',
//             backgroundColor: 'var(--color-bg-secondary)',
//           }}
//         >
//           {/* Accent color bar at very top */}
//           <div
//             style={{
//               height: '3px',
//               backgroundColor: accentColor,
//               borderRadius: '16px 16px 0 0',
//             }}
//           />

code = code.replace(
  /borderBottom: '1px solid var\(--color-border\)',\s*backgroundColor: 'var\(--color-bg-secondary\)',/,
  `borderBottom: '1px solid rgba(0,0,0,0.04)',
            backgroundColor: 'transparent',`
);

// Change the top bar to be removed, we will add a colored dot next to the emoji instead
code = code.replace(
  /<\!-- Accent color bar at very top -->[\s\S]*?borderRadius: '16px 16px 0 0',[\s\S]*?\}\/[\s\S]*?\/>/,
  ''
);

// Actually, the comment in the code is {/* Accent color bar at very top */}
code = code.replace(
  /\{\/\* Accent color bar at very top \*\/\}[\s\S]*?borderRadius: '16px 16px 0 0',\s*\}\}\s*\/>/,
  ''
);

// Add the colored dot inside the header
//             {/* Emoji + Label */}
//             <span
//               style={{
//                 fontSize: '15px',
//                 lineHeight: 1,
//                 flexShrink: 0,
//                 userSelect: 'none',
//               }}
//             >
//               {STATUS_EMOJI[status]}
//             </span>
code = code.replace(
  /\{\/\* Emoji \+ Label \*\/\}[\s\S]*?\{STATUS_EMOJI\[status\]\}[\s\S]*?<\/span>/,
  `{/* Accent Dot + Emoji */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: accentColor, flexShrink: 0 }} />
              <span
                style={{
                  fontSize: '15px',
                  lineHeight: 1,
                  flexShrink: 0,
                  userSelect: 'none',
                }}
              >
                {STATUS_EMOJI[status]}
              </span>
            </div>`
);

fs.writeFileSync('src/modules/tasks/components/TaskBoardColumn.tsx', code);
