const QUESTIONS_PATH = './questions.json';

class Quiz {
  constructor(questions){
    this.questions = questions || [];
    this.index = 0;
    this.score = 0;
    this.answered = false;
  }

  current(){ return this.questions[this.index]; }
  hasNext(){ return this.index < this.questions.length - 1; }
  next(){ if(this.hasNext()){ this.index++; this.answered = false; return true } return false }

  answer(choiceIndex){
    if(this.answered) return {ok:false, reason:'already answered'};
    const q = this.current();
    if(!q || !Array.isArray(q.choices)) return {ok:false, reason:'invalid question'};
    this.answered = true;
    const correct = (choiceIndex === q.answer);
    if(correct) this.score += 1;
    return {ok:true, correct, correctIndex: q.answer}
  }
}

// UI wiring
const elQuestionText = document.getElementById('question-text');
const elQuestionNumber = document.getElementById('question-number');
const elChoices = document.getElementById('choices');
const elScore = document.getElementById('score');
const elNextBtn = document.getElementById('next-btn');
const elResult = document.getElementById('result');
const elGame = document.getElementById('game');
const elFinalScore = document.getElementById('final-score');
const elPlayAgain = document.getElementById('play-again');
const elSaveForm = document.getElementById('save-score-form');
const elName = document.getElementById('name');
const elLeaderboardList = document.getElementById('leaderboard-list');
const elExportBtn = document.getElementById('export-leaderboard');
const elClearBtn = document.getElementById('clear-leaderboard');

let quiz = null;
const DEFAULT_TIME = 20; // seconds per question

async function loadQuestions(){
  try{
    const resp = await fetch(QUESTIONS_PATH);
    if(!resp.ok) throw new Error('Failed to load questions');
    const data = await resp.json();
    if(!Array.isArray(data) || data.length === 0) throw new Error('No questions found');
    return data;
  }catch(err){
    console.error(err);
    elQuestionText.textContent = 'Could not load questions. Check console for details.';
    return [];
  }
}

function startGame(questions){
  quiz = new Quiz(questions);
  elScore.textContent = `Score: ${quiz.score}`;
  elGame.classList.remove('hidden');
  elResult.classList.add('hidden');
  renderQuestion();
}

function renderQuestion(){
  const q = quiz.current();
  if(!q) return endGame();
  elQuestionNumber.textContent = `Question ${quiz.index + 1} / ${quiz.questions.length}`;
  elQuestionText.textContent = q.question;
  elChoices.innerHTML = '';
  q.choices.forEach((choice, i)=>{
    const li = document.createElement('li');
    li.className = 'choice';
    li.dataset.index = i;
    li.tabIndex = 0;
    li.textContent = choice;
    li.addEventListener('click', onChoiceClick);
    li.addEventListener('keypress', (e)=>{ if(e.key === 'Enter') onChoiceClick.call(li, e) });
    elChoices.appendChild(li);
  });
  elNextBtn.disabled = true;
  // set up time display
  const elTimer = document.getElementById('timer');
  elTimer.textContent = `Time: ${DEFAULT_TIME}s`;
  // attach a per-question timer to quiz
  quiz.timeLeft = DEFAULT_TIME;
  if(quiz.timer) clearInterval(quiz.timer);
  quiz.timer = setInterval(()=>{
    quiz.timeLeft -= 1;
    elTimer.textContent = `Time: ${quiz.timeLeft}s`;
    if(quiz.timeLeft <= 0){
      clearInterval(quiz.timer);
      quiz.answered = true;
      const q = quiz.current();
      Array.from(elChoices.children).forEach((child, i)=>{
        child.classList.remove('correct','wrong');
        if(i === q.answer) child.classList.add('correct');
        child.removeEventListener('click', onChoiceClick);
      });
      elNextBtn.disabled = false;
    }
  }, 1000);
}

function onChoiceClick(e){
  const idx = Number(this.dataset.index);
  const res = quiz.answer(idx);
  if(!res.ok){ return }
  Array.from(elChoices.children).forEach((child, i)=>{
    child.classList.remove('correct','wrong');
    child.removeEventListener('click', onChoiceClick);
    if(i === res.correctIndex) child.classList.add('correct');
    if(i === idx && !res.correct) child.classList.add('wrong');
  });
  elScore.textContent = `Score: ${quiz.score}`;
  elNextBtn.disabled = false;
}

function endGame(){
  elGame.classList.add('hidden');
  elResult.classList.remove('hidden');
  elFinalScore.textContent = `You scored ${quiz.score} / ${quiz.questions.length}`;
  renderLeaderboard();
}

elNextBtn.addEventListener('click', ()=>{
  if(quiz.timer) clearInterval(quiz.timer);
  const moved = quiz.next();
  if(!moved) return endGame();
  renderQuestion();
});

elPlayAgain.addEventListener('click', ()=>{
  startGame(quiz.questions);
});

elSaveForm.addEventListener('submit', (e)=>{
  e.preventDefault();
  const name = elName.value.trim() || 'Anonymous';
  saveScore(name, quiz.score);
  renderLeaderboard();
  elSaveForm.reset();
});

function saveScore(name, score){
  try{
    const key = 'quiz_leaderboard_v1';
    const raw = localStorage.getItem(key) || '[]';
    const arr = JSON.parse(raw);
    const entry = {name, score, date: new Date().toISOString()};
    arr.push(entry);
    arr.sort((a,b)=>b.score - a.score || new Date(a.date) - new Date(b.date));
    if(arr.length > 10) arr.length = 10;
    localStorage.setItem(key, JSON.stringify(arr));
    // expose last saved id for highlighting
    localStorage.setItem('quiz_last_saved', JSON.stringify(entry));
  }catch(err){ console.error('Failed to save score', err) }
}

function renderLeaderboard(){
  try{
    const key = 'quiz_leaderboard_v1';
    const raw = localStorage.getItem(key) || '[]';
    const arr = JSON.parse(raw);
    elLeaderboardList.innerHTML = '';
    if(arr.length === 0){ elLeaderboardList.innerHTML = '<li>No scores yet</li>'; return }
    const lastSaved = JSON.parse(localStorage.getItem('quiz_last_saved') || 'null');
    arr.forEach(item=>{
      const li = document.createElement('li');
      const when = new Date(item.date || Date.now()).toLocaleString();
      li.textContent = `${item.name} — ${item.score} (${when})`;
      if(lastSaved && lastSaved.name === item.name && lastSaved.score === item.score && lastSaved.date === item.date){
        li.classList.add('highlight');
      }
      elLeaderboardList.appendChild(li);
    });
  }catch(err){ console.error(err); }
}

function exportLeaderboard(){
  try{
    const key = 'quiz_leaderboard_v1';
    const raw = localStorage.getItem(key) || '[]';
    const arr = JSON.parse(raw);
    if(arr.length === 0) return alert('No scores to export');
    const rows = [['Name','Score','Date']].concat(arr.map(r=>[r.name, r.score, r.date]));
    const csv = rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'leaderboard.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }catch(err){ console.error('Failed to export', err); }
}

function clearLeaderboard(){
  try{
    if(!confirm('Clear leaderboard? This cannot be undone.')) return;
    localStorage.removeItem('quiz_leaderboard_v1');
    localStorage.removeItem('quiz_last_saved');
    renderLeaderboard();
  }catch(err){ console.error(err); }
}

elExportBtn?.addEventListener('click', exportLeaderboard);
elClearBtn?.addEventListener('click', clearLeaderboard);

// bootstrap
(async function(){
  const qs = await loadQuestions();
  if(qs.length === 0) return;
  startGame(qs);
})();
