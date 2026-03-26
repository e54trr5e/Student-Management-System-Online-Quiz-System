const quizzes = [
  {
    id: "cs-basics",
    name: "CS Fundamentals",
    category: "CS",
    duration: 300,
    questions: [
      {
        question: "What is the time complexity of Binary Search?",
        options: ["O(n)", "O(log n)", "O(n²)", "O(1)"],
        answer: 1
      },
      {
        question: "Which data structure uses LIFO order?",
        options: ["Queue", "Linked List", "Stack", "Tree"],
        answer: 2
      }
    ]
  }
];

const auth = {
  usersKey: "quiz_users",
  sessionKey: "quiz_session",

  getUsers() {
    return JSON.parse(localStorage.getItem(this.usersKey)) || [];
  },

  saveUsers(users) {
    localStorage.setItem(this.usersKey, JSON.stringify(users));
  },

  async register(name, email, password) {
    const res = await fetch('http://localhost:5000/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });

    const data = await res.json();
    return data.success;
  },

  async login(email, password) {
    const res = await fetch('http://localhost:5000/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (data.success) {
      sessionStorage.setItem(this.sessionKey, email);
      return true;
    }

    return false;
  },

  logout() {
    sessionStorage.removeItem(this.sessionKey);
  }
};

const app = {
  currentQuiz: null,
  currentQuestion: 0,
  score: 0,
  timerInterval: null, timeLeft: 0,

  init() {
    this.renderQuizCards();
    this.attachEvents();
  },

  renderQuizCards() {
    const grid = document.getElementById("quiz-grid");

    quizzes.forEach(quiz => {
      const card = document.createElement("div");
      card.className = "quiz-card";
      card.innerHTML = `
        <h3>${quiz.name}</h3>
        <p>${quiz.category}</p>
      `;

      card.onclick = () => this.startQuiz(quiz);

      grid.appendChild(card);
    });
  },

  startQuiz(quiz) {
    this.currentQuiz = quiz;
    this.currentQuestion = 0;
    this.score = 0;

    this.timeLeft = quiz.duration; this.startTimer();

    document.getElementById("lobby-screen").classList.remove("active");
    document.getElementById("quiz-screen").classList.add("active");

    this.showQuestion();
  },

  showQuestion() {
    const q = this.currentQuiz.questions[this.currentQuestion];

    document.getElementById("question-number").textContent =
      `Question ${this.currentQuestion + 1}`;

    document.getElementById("question-text").textContent =
      q.question;

    const container = document.getElementById("options-container");
    container.innerHTML = "";

    q.options.forEach((option, index) => {
      const btn = document.createElement("button");
      btn.textContent = option;
      btn.className = "option-btn";

      btn.onclick = () => this.checkAnswer(index);

      container.appendChild(btn);
    });
  },

  startTimer() {
    clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      this.timeLeft--;
      document.getElementById("timer").textContent =
        this.timeLeft + " sec";
      if (this.timeLeft <= 0) {
        clearInterval(this.timerInterval);
        this.showResult();
      }
    }, 1000);
  },

  checkAnswer(selected) {
    const correct = this.currentQuiz.questions[this.currentQuestion].answer;

    if (selected === correct) {
      this.score++;
    }

    this.currentQuestion++;

    if (this.currentQuestion < this.currentQuiz.questions.length) {
      this.showQuestion();
    } else {
      this.showResult();
    } 
  },

  showResult() {

    clearInterval(this.timerInterval);
    fetch('http://localhost:5000/save-result',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: sessionStorage.getItem('quiz_session'),
          quiz_name: this.currentQuiz.name,
          score: this.score
        })
      });

    document.getElementById("quiz-screen").classList.remove("active");
    document.getElementById("result-screen").classList.add("active");

    const percent =
      (this.score / this.currentQuiz.questions.length) * 100;

    document.getElementById("result-percent").textContent =
      `${percent}%`;
  },

  attachEvents() {
    document.getElementById("logout-btn").onclick = () => {
      auth.logout();
      location.reload();
    };
  }
};

document.addEventListener("DOMContentLoaded", () => app.init());