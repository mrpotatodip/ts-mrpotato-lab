// Quiz widget. Markup: .quiz > .q[data-answer="<index>"] > p + button* + .why[hidden]
document.querySelectorAll(".quiz").forEach(function (quiz) {
  var questions = quiz.querySelectorAll(".q");
  var score = 0;
  var done = 0;
  questions.forEach(function (q) {
    var answer = Number(q.dataset.answer);
    var buttons = q.querySelectorAll("button");
    buttons.forEach(function (button, index) {
      button.type = "button";
      button.addEventListener("click", function () {
        if (q.classList.contains("answered")) return;
        q.classList.add("answered");
        var right = index === answer;
        button.classList.add(right ? "correct" : "wrong");
        if (!right) buttons[answer].classList.add("correct");
        var why = q.querySelector(".why");
        why.hidden = false;
        why.insertBefore(document.createTextNode(right ? "Correct. " : "Not this one. "), why.firstChild);
        done += 1;
        if (right) score += 1;
        var label = quiz.querySelector(".score");
        if (label) label.textContent = "Score: " + score + " / " + questions.length + (done === questions.length ? " (done)" : "");
      });
    });
  });
});
