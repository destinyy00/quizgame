const fs = require('fs');
const path = require('path');

const file = path.resolve(__dirname, 'questions.json');
let raw = fs.readFileSync(file, 'utf8');
let arr = JSON.parse(raw);
if(!Array.isArray(arr)) throw new Error('questions.json must be an array');
arr.forEach((q, i)=>{
  if(typeof q.question !== 'string') throw new Error(`question ${i} missing question text`);
  if(!Array.isArray(q.choices) || q.choices.length < 2) throw new Error(`question ${i} must have at least 2 choices`);
  if(typeof q.answer !== 'number' || q.answer < 0 || q.answer >= q.choices.length) throw new Error(`question ${i} has invalid answer index`);
});
console.log('questions.json looks good');
