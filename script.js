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

// bootstrap
(async function(){
  const qs = await loadQuestions();
  if(qs.length === 0) return;
  startGame(qs);
})();
