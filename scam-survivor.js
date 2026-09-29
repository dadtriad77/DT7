const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

const storage = {
  get(k, fallback=0){ return Number(localStorage.getItem(k) ?? fallback); },
  set(k,v){ localStorage.setItem(k, String(v)); }
};

function showScreen(id){
  $$(".screen").forEach(s => s.classList.remove("active"));
  $("#" + id).classList.add("active");
  window.scrollTo({top:0, behavior:"smooth"});
}
$$("[data-screen]").forEach(el => el.addEventListener("click", e => {
  e.preventDefault();
  showScreen(el.dataset.screen);
}));

function refreshHomeStats(){
  $("#bestScore").textContent = storage.get("bestScore");
  $("#bestCpm").textContent = storage.get("bestCpm");
  $("#scamsCaught").textContent = storage.get("scamsCaught");
  const caught = storage.get("scamsCaught");
  $("#levelLabel").textContent = caught >= 5 ? "Level 2" : "Level 1";
}
refreshHomeStats();

const scenarios = [
  {
    type:"Email", answer:"scam",
    html:`<b>Microsoft Account Security</b><span class="meta">From: security-team@micr0soft-alerts.com</span><p>Your mailbox will be disabled in 30 minutes due to unusual activity. Confirm your password immediately.</p><p><a href="#">https://microsoft.verify-account-login.example</a></p>`,
    sender:"The sender uses “micr0soft” with a zero and a non-Microsoft domain.",
    link:"The displayed text tries to look official, but the destination is not microsoft.com.",
    hint:"Urgency + password request + look-alike domain are major red flags."
  },
  {
    type:"Text Message", answer:"scam",
    html:`<b>USPS Delivery Alert</b><p>Your package cannot be delivered because of an incomplete address. Pay a $0.30 redelivery fee now.</p><p><a href="#">usps-redelivery-fee.example</a></p>`,
    sender:"Unexpected delivery messages should be verified through the official carrier app or website.",
    link:"This is not an official USPS domain.",
    hint:"Small payment requests are often used to steal card details."
  },
  {
    type:"Email", answer:"legitimate",
    html:`<b>Class Registration Confirmation</b><span class="meta">From: registrar@college.example.edu</span><p>Your registration for NETW 1300 has been completed. No action is required. Sign in through your normal student portal if you want to review your schedule.</p>`,
    sender:"The message comes from the expected school domain and does not ask for credentials or payment.",
    link:"No direct sign-in link is included; it tells you to use your normal portal.",
    hint:"No urgency, no unexpected payment, and no request for sensitive information."
  },
  {
    type:"Phone Call", answer:"verify",
    html:`<b>Bank Fraud Department</b><p>A caller says there may be suspicious activity on your debit card and asks you to confirm your identity before discussing it.</p>`,
    sender:"Caller ID can be spoofed, even when a familiar bank name appears.",
    link:"No link is involved. The safest move is to hang up and call the number on the back of your card.",
    hint:"A fraud warning can be real, but you should independently contact the bank."
  },
  {
    type:"Email", answer:"scam",
    html:`<b>Payroll Update Required</b><span class="meta">From: hr-payroll@company-benefits.example</span><p>Employees must re-enter direct deposit information before 5 PM to avoid a payroll delay.</p><p><a href="#">Update Direct Deposit</a></p>`,
    sender:"Payroll changes should be confirmed with HR using an established internal channel.",
    link:"The link goes to an unrelated external domain.",
    hint:"Direct-deposit changes are a common business email compromise target."
  },
  {
    type:"Website", answer:"verify",
    html:`<b>Online Store Checkout</b><p>You find a new store offering a popular laptop for 65% below normal retail price. The site uses HTTPS and accepts only bank transfer or cryptocurrency.</p>`,
    sender:"There is no sender. Check the business reputation, contact information, and domain history.",
    link:"HTTPS alone does not prove a store is trustworthy.",
    hint:"Extreme discounts plus irreversible payment methods deserve extra verification."
  },
  {
    type:"Text Message", answer:"legitimate",
    html:`<b>Appointment Reminder</b><p>Reminder: Your appointment is tomorrow at 2:30 PM. Reply C to confirm or call the office number you already have on file to reschedule. No payment or login is requested.</p>`,
    sender:"The message matches an expected appointment and does not request sensitive data.",
    link:"No link is provided.",
    hint:"Expected context and low-risk instructions make this more likely to be legitimate."
  },
  {
    type:"Email", answer:"scam",
    html:`<b>CEO Gift Card Request</b><span class="meta">From: ceo.office.personal@example-mail.com</span><p>I'm in a meeting. Buy $500 in gift cards immediately and send me the codes. Keep this confidential.</p>`,
    sender:"The sender is using an external personal domain instead of the company domain.",
    link:"No link is needed; the attacker wants gift-card codes.",
    hint:"Secrecy, urgency, and gift cards are classic impersonation red flags."
  },
  {
    type:"Phone Call", answer:"scam",
    html:`<b>Technical Support</b><p>A caller claims your computer is infected and says they need your one-time Microsoft login code to clean it remotely.</p>`,
    sender:"Legitimate support should not need your one-time MFA code.",
    link:"Do not install remote tools or visit URLs given by an unsolicited caller.",
    hint:"Never share one-time security codes."
  },
  {
    type:"Website", answer:"legitimate",
    html:`<b>Known Vendor Portal</b><p>You open a vendor portal from your saved bookmark. The domain matches your contract paperwork, your password manager recognizes it, and MFA prompts through your normal authenticator app.</p>`,
    sender:"The site was reached through a trusted bookmark and matches known vendor information.",
    link:"The exact domain matches your established records.",
    hint:"Multiple independent trust signals support legitimacy."
  },
  {
    type:"Email", answer:"verify",
    html:`<b>Invoice Change Notice</b><span class="meta">From: billing@knownvendor.example</span><p>Our bank account has changed. Please use the attached instructions for all future wire transfers.</p>`,
    sender:"Even if the email looks normal, payment-detail changes should be confirmed through a known contact method.",
    link:"Do not rely only on the email or attachment for bank-detail changes.",
    hint:"Business payment changes are high risk and should be independently verified."
  },
  {
    type:"Text Message", answer:"scam",
    html:`<b>Crypto Investment Group</b><p>Guaranteed 300% return this week. Send $200 now and we will multiply it. Limited spots.</p>`,
    sender:"Unsolicited investment promises with guaranteed returns are a major warning sign.",
    link:"Do not send money or connect a wallet based on unsolicited messages.",
    hint:"Guaranteed high returns and pressure to act quickly are scam indicators."
  }
];

let scenarioIndex = 0, score = 0, security = 100, lives = 3, locked = false;

function renderScenario(){
  const s = scenarios[scenarioIndex];
  $("#scenarioNum").textContent = `${scenarioIndex+1} / ${scenarios.length}`;
  $("#messageType").textContent = s.type;
  $("#scenarioContent").innerHTML = s.html;
  $("#inspectResult").textContent = "";
  $("#scenarioFeedback").className = "feedback";
  $("#scenarioFeedback").innerHTML = "";
  locked = false;
}
function updateGameStats(){
  $("#score").textContent = score;
  $("#security").textContent = `${security}%`;
  $("#lives").textContent = lives > 0 ? "♥ ".repeat(lives).trim() : "—";
}
function finishScenario(answer){
  if(locked) return;
  locked = true;
  const s = scenarios[scenarioIndex];
  const correct = answer === s.answer;
  if(correct){
    score += 20;
    if(s.answer === "scam") storage.set("scamsCaught", storage.get("scamsCaught")+1);
    $("#scenarioFeedback").innerHTML = `<strong>Correct.</strong> Good defensive decision.`;
  } else {
    security = Math.max(0, security-15);
    lives = Math.max(0, lives-1);
    $("#scenarioFeedback").innerHTML = `<strong>Not quite.</strong> The safer answer was <b>${s.answer === "verify" ? "Verify First" : s.answer[0].toUpperCase()+s.answer.slice(1)}</b>.`;
  }
  $("#scenarioFeedback").classList.add("show");
  updateGameStats();
  refreshHomeStats();
  setTimeout(() => {
    scenarioIndex++;
    if(scenarioIndex >= scenarios.length || lives <= 0){
      const oldBest = storage.get("bestScore");
      if(score > oldBest) storage.set("bestScore", score);
      $("#scenarioFeedback").innerHTML = `<strong>Training complete.</strong> Final score: ${score}. Security: ${security}%. <button id="playAgainInline" class="terminal-btn" style="margin-left:10px">Play Again</button>`;
      $("#scenarioFeedback").classList.add("show");
      $("#playAgainInline").addEventListener("click", resetScamGame);
      refreshHomeStats();
      scenarioIndex = scenarios.length-1;
      return;
    }
    renderScenario();
  }, 1300);
}
$$(".decision").forEach(b => b.addEventListener("click", () => finishScenario(b.dataset.answer)));
$("#inspectSender").addEventListener("click", () => $("#inspectResult").textContent = scenarios[scenarioIndex].sender);
$("#inspectLink").addEventListener("click", () => $("#inspectResult").textContent = scenarios[scenarioIndex].link);
$("#useHint").addEventListener("click", () => {
  if(score >= 5) score -= 5;
  $("#score").textContent = score;
  $("#inspectResult").textContent = "HINT: " + scenarios[scenarioIndex].hint;
});
function resetScamGame(){
  scenarioIndex=0;score=0;security=100;lives=3;locked=false;
  updateGameStats();renderScenario();
}
resetScamGame();

const codeSets = {
  beginner: [
`sender = "security@example.com"
trusted_domain = "example.com"

if sender.endswith(trusted_domain):
    print("Verify context before acting")
else:
    print("Treat as suspicious")`,
`mfa_enabled = True
password_reused = False

if mfa_enabled and not password_reused:
    print("Account protection improved")
else:
    print("Review security settings")`,
`url = "https://bank.example"
expected = "bank.example"

if expected in url:
    print("Check the exact domain")
else:
    print("Do not continue")`
  ],
  intermediate: [
`def inspect_message(sender, urgent, asks_for_code):
    risk = 0

    if urgent:
        risk += 1
    if asks_for_code:
        risk += 2
    if "@" not in sender:
        risk += 1

    return "verify" if risk >= 2 else "review"

result = inspect_message("alerts@example.com", True, False)
print(result)`,
`trusted_domains = {"microsoft.com", "google.com", "github.com"}

def domain_is_trusted(address):
    domain = address.split("@")[-1].lower()
    return domain in trusted_domains

email = "support@micr0soft-login.com"

if not domain_is_trusted(email):
    print("Possible look-alike domain")`,
`def safe_payment_change(request):
    if request["new_bank_details"]:
        return "Call a known vendor contact"
    return "Continue normal review"

invoice = {
    "vendor": "Example Supply",
    "new_bank_details": True
}

print(safe_payment_change(invoice))`
  ],
  advanced: [
`from urllib.parse import urlparse

TRUSTED = {"accounts.google.com", "login.microsoftonline.com"}

def classify_url(raw_url):
    parsed = urlparse(raw_url)
    host = (parsed.hostname or "").lower()

    if parsed.scheme != "https":
        return "high-risk"
    if host in TRUSTED:
        return "known-domain"
    if any(host.endswith("." + domain) for domain in TRUSTED):
        return "subdomain-review"
    return "verify-first"

print(classify_url("https://accounts.google.com"))`,
`from dataclasses import dataclass

@dataclass
class Message:
    sender: str
    urgent: bool
    requests_secret: bool
    payment_change: bool

def risk_score(message):
    score = 0
    score += 2 if message.urgent else 0
    score += 5 if message.requests_secret else 0
    score += 4 if message.payment_change else 0
    return score

sample = Message(
    sender="billing@example.com",
    urgent=True,
    requests_secret=False,
    payment_change=True,
)

print("verify-first" if risk_score(sample) >= 4 else "review")`,
`import re

def looks_like_otp_request(text):
    patterns = [
        r"one[- ]time code",
        r"verification code",
        r"\bOTP\b",
        r"security code",
    ]
    normalized = text.lower()
    return any(re.search(pattern, normalized, re.I) for pattern in patterns)

message = "Send me the verification code you just received."

if looks_like_otp_request(message):
    print("Never share authentication codes")`
  ]
};

let currentCode = "";
let typingStarted = false;
let timerId = null;
let startTime = 0;
let duration = 60;
let remaining = 60;

function pickCode(){
  const level = $("#difficulty").value;
  const list = codeSets[level];
  currentCode = list[Math.floor(Math.random()*list.length)];
  $("#codeInput").value = "";
  $("#codeDisplay").textContent = currentCode;
  resetTypingStats();
}
function resetTypingStats(){
  clearInterval(timerId);
  typingStarted = false;
  duration = Number($("#duration").value);
  remaining = duration;
  $("#timeLeft").textContent = `${remaining}s`;
  $("#cpm").textContent = "0";
  $("#accuracy").textContent = "100%";
  $("#errors").textContent = "0";
  $("#typingStatus").textContent = "Timer starts with your first key.";
  renderTypedCode("");
}
function renderTypedCode(input){
  let out = "";
  for(let i=0;i<currentCode.length;i++){
    const ch = currentCode[i];
    const safe = ch.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
    if(i < input.length){
      out += `<span class="${input[i]===ch ? "good":"bad"}">${safe}</span>`;
    }else{
      out += `<span class="pending">${safe}</span>`;
    }
  }
  $("#codeDisplay").innerHTML = out;
}
function startTimer(){
  if(typingStarted) return;
  typingStarted = true;
  startTime = Date.now();
  $("#typingStatus").textContent = "Training in progress...";
  timerId = setInterval(() => {
    const elapsed = Math.floor((Date.now()-startTime)/1000);
    remaining = Math.max(0, duration-elapsed);
    $("#timeLeft").textContent = `${remaining}s`;
    if(remaining <= 0) finishTyping();
  },250);
}
function calculateTyping(){
  const input = $("#codeInput").value;
  let correct = 0;
  for(let i=0;i<input.length;i++) if(input[i]===currentCode[i]) correct++;
  const errors = Math.max(0,input.length-correct);
  const acc = input.length ? Math.round(correct/input.length*100) : 100;
  const elapsedMin = Math.max((Date.now()-startTime)/60000, 1/60);
  const cpm = typingStarted ? Math.round(correct/elapsedMin) : 0;
  $("#errors").textContent = errors;
  $("#accuracy").textContent = `${acc}%`;
  $("#cpm").textContent = cpm;
  renderTypedCode(input);
  return {input,correct,errors,acc,cpm};
}
function finishTyping(){
  clearInterval(timerId);
  const result = calculateTyping();
  $("#codeInput").disabled = true;
  $("#typingStatus").textContent = result.input === currentCode
    ? `Challenge complete — ${result.cpm} CPM at ${result.acc}% accuracy.`
    : `Time — ${result.cpm} CPM at ${result.acc}% accuracy.`;
  if(result.cpm > storage.get("bestCpm")) storage.set("bestCpm", result.cpm);
  refreshHomeStats();
}
$("#codeInput").addEventListener("keydown", e => {
  if(e.key === "Tab"){
    e.preventDefault();
    const t = e.currentTarget;
    const start=t.selectionStart,end=t.selectionEnd;
    t.value=t.value.slice(0,start)+"    "+t.value.slice(end);
    t.selectionStart=t.selectionEnd=start+4;
    t.dispatchEvent(new Event("input"));
  }
});
$("#codeInput").addEventListener("input", () => {
  startTimer();
  const result = calculateTyping();
  if(result.input === currentCode) finishTyping();
});
$("#restartTyping").addEventListener("click", () => {
  $("#codeInput").disabled = false;
  $("#codeInput").value = "";
  resetTypingStats();
  $("#codeInput").focus();
});
$("#newCode").addEventListener("click", () => {
  $("#codeInput").disabled = false;
  pickCode();
  $("#codeInput").focus();
});
$("#difficulty").addEventListener("change", () => { $("#codeInput").disabled=false; pickCode(); });
$("#duration").addEventListener("change", resetTypingStats);

pickCode();
