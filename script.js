const QUESTIONS_PATH = './questions.json';
const DEFAULT_TIME = 20; // seconds per question

class Quiz {
  constructor(questions, opts={}){
    this.questions = questions || [];
    this.timePerQuestion = opts.timePerQuestion || DEFAULT_TIME;
    this.index = 0;
    this.score = 0;
    this.timer = null;
    this.timeLeft = this.timePerQuestion;
    this.answered = false;
  }

  current(){ return this.questions[this.index]; }
  hasNext(){ return this.index < this.questions.length - 1; }
  next(){ if(this.hasNext()){ this.index++; this.resetForQuestion(); return true } return false }

  resetForQuestion(){ this.timeLeft = this.timePerQuestion; this.answered = false }

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
const elTimer = document.getElementById('timer');
const elResult = document.getElementById('result');
const elGame = document.getElementById('game');
const elFinalScore = document.getElementById('final-score');
const elSaveForm = document.getElementById('save-score-form');
const elName = document.getElementById('name');
const elPlayAgain = document.getElementById('play-again');
const elLeaderboardList = document.getElementById('leaderboard-list');

let quiz = null;

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
  quiz = new Quiz(questions, {timePerQuestion: DEFAULT_TIME});
  elScore.textContent = `Score: ${quiz.score}`;
  elGame.classList.remove('hidden');
  elResult.classList.add('hidden');
  renderQuestion();
  startTimer();
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
}

function onChoiceClick(e){
  const idx = Number(this.dataset.index);
  const res = quiz.answer(idx);
  if(!res.ok){ return }
  // highlight answers
  Array.from(elChoices.children).forEach((child, i)=>{
    child.classList.remove('correct','wrong');
    child.removeEventListener('click', onChoiceClick);
    if(i === res.correctIndex) child.classList.add('correct');
    if(i === idx && !res.correct) child.classList.add('wrong');
  });
  elScore.textContent = `Score: ${quiz.score}`;
  elNextBtn.disabled = false;
  stopTimer();
}

function endGame(){
  stopTimer();
  elGame.classList.add('hidden');
  elResult.classList.remove('hidden');
  elFinalScore.textContent = `You scored ${quiz.score} / ${quiz.questions.length}`;
  renderLeaderboard();
}

function startTimer(){
  stopTimer();
  elTimer.textContent = `Time: ${quiz.timeLeft}s`;
  quiz.timer = setInterval(()=>{
    quiz.timeLeft -= 1;
    elTimer.textContent = `Time: ${quiz.timeLeft}s`;
    if(quiz.timeLeft <= 0){
      // timeout: treat as incorrect and move on
      stopTimer();
      // mark as answered to prevent double answers
      quiz.answered = true;
      // show correct answer
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

function stopTimer(){
  if(quiz && quiz.timer) clearInterval(quiz.timer);
  quiz.timer = null;
}

elNextBtn.addEventListener('click', ()=>{
  const moved = quiz.next();
  if(!moved) return endGame();
  renderQuestion();
  startTimer();
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
    arr.push({name, score, date: new Date().toISOString()});
    arr.sort((a,b)=>b.score - a.score || new Date(a.date) - new Date(b.date));
    if(arr.length > 10) arr.length = 10;
    localStorage.setItem(key, JSON.stringify(arr));
  }catch(err){ console.error('Failed to save score', err) }
}

function renderLeaderboard(){
  try{
    const key = 'quiz_leaderboard_v1';
    const raw = localStorage.getItem(key) || '[]';
    const arr = JSON.parse(raw);
    elLeaderboardList.innerHTML = '';
    if(arr.length === 0){ elLeaderboardList.innerHTML = '<li>No scores yet</li>'; return }
    arr.forEach(item=>{
      const li = document.createElement('li');
      li.textContent = `${item.name} — ${item.score}`;
      elLeaderboardList.appendChild(li);
    });
  }catch(err){ console.error(err); }
}

// bootstrap
(async function(){
  const qs = await loadQuestions();
  if(qs.length === 0) return;
  startGame(qs);
})();
