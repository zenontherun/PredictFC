const fs = require('fs');
let content = fs.readFileSync('src/App.jsx', 'utf8');

// The exact inverse of what we did, to restore the dark mode but keep the flashy image.
const map = {
  // Text Colors (revert first so we don't conflict with background colors)
  'color: "#0f172a"': 'color: "#fff"',
  'color: "#64748b"': 'color: "#8b949e"',
  'color: "#475569"': 'color: "#e6edf3"',
  'color: "#ffffff"': 'color: "#0b0f14"', // for buttons
  
  // Backgrounds
  'background: "transparent"': 'background: "#0b0f14"',
  'background: "rgba(255, 255, 255, 0.9)"': 'background: "#161b22"',
  'background: "rgba(255, 255, 255, 0.95)"': 'background: "linear-gradient(135deg, #161b22, #0d1117)"',
  'background: "#f8fafc"': 'background: "#010409"',
  
  // Borders
  'border: "1px solid #e2e8f0"': 'border: "1px solid #30363d"',
  'border: "1px solid #cbd5e1"': 'border: "1px solid #484f58"',
  'borderColor: "#e2e8f0"': 'borderColor: "#30363d"',
  'borderColor = "#cbd5e1"': 'borderColor = "#484f58"',
  
  // Box shadows
  'box-shadow: 0 8px 32px rgba(0,0,0,0.08)': 'box-shadow: 0 8px 32px rgba(0,0,0,0.4)',
  'boxShadow: "0 8px 32px rgba(0,0,0,0.1)"': 'boxShadow: "0 8px 32px rgba(0,0,0,0.5)"'
};

for (const [oldStr, newStr] of Object.entries(map)) {
  content = content.split(oldStr).join(newStr);
}

// Fix styles block specifically
content = content.replace(/color: #0f172a;/g, 'color: #fff;')
  .replace(/color: #ffffff;/g, 'color: #0b0f14;')
  .replace(/background: #f8fafc;/g, 'background: #010409;')
  .replace(/border: 1px solid #cbd5e1;/g, 'border: 1px solid #484f58;')
  .replace(/background: #ffffff;/g, 'background: #0b0f14;')
  .replace(/border-color: #e2e8f0;/g, 'border-color: #30363d;');

// Fix the score-box-container gradient specifically
content = content.replace(
  'background: rgba(255, 255, 255, 0.9);', 
  'background: linear-gradient(180deg, rgba(22, 27, 34, 0.7) 0%, rgba(13, 17, 23, 0.8) 100%);'
);

fs.writeFileSync('src/App.jsx', content);
console.log('Done');
