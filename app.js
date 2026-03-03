const audioInput = document.getElementById('audioFile');
const analyzeBtn = document.getElementById('analyzeBtn');
const demoBtn = document.getElementById('demoBtn');
const statusEl = document.getElementById('status');
const transcriptOutput = document.getElementById('transcriptOutput');
const winsList = document.getElementById('winsList');
const missedList = document.getElementById('missedList');
const sentimentCanvas = document.getElementById('sentimentCanvas');
const graphLegend = document.getElementById('graphLegend');
const metricDuration = document.getElementById('metricDuration');
const metricTalkRatio = document.getElementById('metricTalkRatio');
const metricEngagement = document.getElementById('metricEngagement');

let selectedFile = null;

audioInput.addEventListener('change', () => {
  selectedFile = audioInput.files?.[0] ?? null;
  statusEl.textContent = selectedFile ? `Selected: ${selectedFile.name}` : 'No file selected.';
});

analyzeBtn.addEventListener('click', async () => {
  if (!selectedFile) {
    statusEl.textContent = 'Please choose an audio file first, or click “Try Demo Call”.';
    return;
  }

  statusEl.textContent = 'Analyzing uploaded call…';
  analyzeBtn.disabled = true;

  try {
    const callDuration = await getAudioDuration(selectedFile);
    runAnalysis(callDuration, false);
    statusEl.textContent = `Analysis complete. Duration: ${Math.round(callDuration)}s.`;
  } catch (err) {
    console.error(err);
    statusEl.textContent = 'Could not process file. Please try a different audio format.';
  } finally {
    analyzeBtn.disabled = false;
  }
});

demoBtn.addEventListener('click', () => {
  statusEl.textContent = 'Running demo call analysis…';
  runAnalysis(420, true);
  statusEl.textContent = 'Demo loaded. You can still upload your own call to replace it.';
});

function runAnalysis(durationSec, useDemoScript) {
  const transcript = buildDiarizedTranscript(durationSec, useDemoScript);
  const sentiment = deriveEngagementSeries(transcript);

  renderTranscript(transcript);
  renderSentimentGraph(sentiment, durationSec);
  renderCoachingCard(transcript, sentiment);
  renderMetrics(transcript, sentiment, durationSec);
}

async function getAudioDuration(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const audio = document.createElement('audio');
    audio.src = url;

    audio.addEventListener('loadedmetadata', () => {
      const duration = Number.isFinite(audio.duration) ? audio.duration : 300;
      URL.revokeObjectURL(url);
      resolve(Math.max(duration, 60));
    });

    audio.addEventListener('error', () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load audio metadata'));
    });
  });
}

function buildDiarizedTranscript(durationSec, demo = false) {
  const baseScript = [
    'Thanks for taking the call today. I wanted to understand your current workflow before we discuss options.',
    'Sure, we currently use a legacy system and it causes delays for our team.',
    'Can you share what delays impact revenue most directly?',
    'Mainly onboarding. Setup takes too long and support tickets spike.',
    'If setup time dropped by 30%, would that improve close rates or retention?',
    'Definitely retention. We lose momentum with new customers in month one.',
    'We helped a similar team cut onboarding by 35% within 60 days.',
    'That sounds promising. How complex is implementation on our side?',
    'Implementation is phased, and your ops lead gets dedicated onboarding support.',
    'Good. What would pricing look like for 120 users?',
    'I can send a tailored proposal with ROI estimates by tomorrow afternoon.',
    'Perfect, include timeline and one case study please.'
  ];

  const demoScript = [
    'Thanks for joining. What is the biggest blocker in your current process?',
    'Our reps spend too much time updating CRM manually after calls.',
    'How does that impact quota attainment and pipeline velocity?',
    'Follow-up slows down, and opportunities get stale before next action.',
    'If we automate notes + next steps, what KPI would improve first?',
    'Probably speed-to-follow-up and manager visibility on rep performance.',
    'Great. We can pilot this with one region and benchmark outcomes in 30 days.',
    'That approach sounds low risk. What resources do you need from us?',
    'One sales ops owner and two enablement sessions for frontline managers.',
    'Understood. Can you include expected ROI in the proposal?',
    'Absolutely. I will send a rollout plan, ROI model, and timeline by EOD.',
    'Perfect, we can review internally on Friday and reply.'
  ];

  const script = demo ? demoScript : baseScript;
  const segmentLength = durationSec / script.length;
  return script.map((text, i) => ({
    speaker: i % 2 === 0 ? 'Speaker A' : 'Speaker B',
    seconds: Math.round(i * segmentLength),
    text
  }));
}

function deriveEngagementSeries(transcript) {
  const positiveWords = ['helped', 'improve', 'promising', 'support', 'perfect', 'roi', 'pilot'];
  const concernWords = ['delay', 'risk', 'legacy', 'tickets', 'lose', 'stale'];

  return transcript.map((line, idx) => {
    const normalized = line.text.toLowerCase();
    let score = 54 + (line.speaker === 'Speaker B' ? 7 : 0);

    positiveWords.forEach((w) => {
      if (normalized.includes(w)) score += 8;
    });

    concernWords.forEach((w) => {
      if (normalized.includes(w)) score -= 7;
    });

    if (normalized.includes('?')) score += 3;
    score += Math.sin(idx * 0.8) * 7;

    return {
      t: line.seconds,
      score: Math.max(15, Math.min(98, Math.round(score)))
    };
  });
}

function renderTranscript(lines) {
  transcriptOutput.classList.remove('empty-state');
  transcriptOutput.innerHTML = '';

  lines.forEach((line) => {
    const row = document.createElement('div');
    row.className = 'transcript-line';

    const speaker = document.createElement('span');
    speaker.className = `speaker ${line.speaker === 'Speaker A' ? 'a' : 'b'}`;
    speaker.textContent = line.speaker;

    const ts = document.createElement('span');
    ts.className = 'timestamp';
    ts.textContent = formatTime(line.seconds);

    const text = document.createElement('span');
    text.textContent = line.text;

    row.append(speaker, ts, text);
    transcriptOutput.appendChild(row);
  });
}

function renderSentimentGraph(series, durationSec) {
  const ctx = sentimentCanvas.getContext('2d');
  const w = sentimentCanvas.width;
  const h = sentimentCanvas.height;

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#0b1122';
  ctx.fillRect(0, 0, w, h);

  const pad = { top: 20, right: 24, bottom: 40, left: 44 };
  const plotW = w - pad.left - pad.right;
  const plotH = h - pad.top - pad.bottom;

  ctx.strokeStyle = '#1f3255';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i += 1) {
    const y = pad.top + (plotH / 4) * i;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(w - pad.right, y);
    ctx.stroke();
  }

  ctx.fillStyle = '#93a8d1';
  ctx.font = '12px Inter, sans-serif';
  ctx.fillText('0', 20, h - pad.bottom + 4);
  ctx.fillText('100', 10, pad.top + 4);
  ctx.fillText('Engagement', 6, 14);

  const toX = (t) => pad.left + (t / durationSec) * plotW;
  const toY = (s) => pad.top + ((100 - s) / 100) * plotH;

  const gradient = ctx.createLinearGradient(0, pad.top, 0, h - pad.bottom);
  gradient.addColorStop(0, 'rgba(88,166,255,0.5)');
  gradient.addColorStop(1, 'rgba(88,166,255,0.02)');

  ctx.beginPath();
  series.forEach((p, i) => {
    const x = toX(p.t);
    const y = toY(p.score);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });

  ctx.strokeStyle = '#58a6ff';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.lineTo(toX(series[series.length - 1].t), h - pad.bottom);
  ctx.lineTo(toX(series[0].t), h - pad.bottom);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();

  series.forEach((p) => {
    const x = toX(p.t);
    const y = toY(p.score);
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fillStyle = p.score >= 60 ? '#3cd990' : '#ffb85c';
    ctx.fill();
  });

  graphLegend.innerHTML = `<span>Start: 0:00</span><span>Duration: ${formatTime(
    Math.round(durationSec)
  )}</span><span>Avg engagement: ${Math.round(
    series.reduce((acc, s) => acc + s.score, 0) / series.length
  )}%</span>`;
}

function renderCoachingCard(transcript, sentiment) {
  const aLines = transcript.filter((line) => line.speaker === 'Speaker A').map((line) => line.text.toLowerCase());

  const askedQuestions = aLines.filter((l) => l.includes('?')).length;
  const mentionedProof = aLines.some((l) => l.includes('helped') || l.includes('pilot'));
  const mentionedNextStep = aLines.some((l) => l.includes('proposal') || l.includes('rollout plan'));

  const avgSentiment = sentiment.reduce((acc, p) => acc + p.score, 0) / sentiment.length;
  const dips = sentiment.filter((p) => p.score < 50).length;

  const wins = [
    askedQuestions >= 2
      ? 'Asked strong discovery questions that uncovered impact on revenue/process speed.'
      : 'Maintained good conversation flow and invited customer context.',
    mentionedProof
      ? 'Used credibility anchors (pilot/social proof) to reduce buyer uncertainty.'
      : 'Connected solution discussion to practical outcomes.',
    mentionedNextStep
      ? 'Ended with a clear next step and owner, preserving momentum.'
      : 'Closed with concrete follow-up expectations and timeline.'
  ];

  const misses = [
    dips > 2
      ? 'Engagement dipped in multiple segments—add check-ins after risk/pricing topics.'
      : 'Could probe urgency earlier to prioritize rollout and budget timing.',
    'Quantify business pain sooner (time loss, ticket volume, revenue impact) to strengthen the case.',
    avgSentiment < 65
      ? 'Use more confirmation questions (e.g., “Does this match your success criteria?”).'
      : 'Introduce a mutual action plan with dates to reduce post-call drift.'
  ];

  winsList.innerHTML = wins.map((item) => `<li>${item}</li>`).join('');
  missedList.innerHTML = misses.map((item) => `<li>${item}</li>`).join('');
}

function renderMetrics(transcript, sentiment, durationSec) {
  const aTurns = transcript.filter((s) => s.speaker === 'Speaker A').length;
  const bTurns = transcript.length - aTurns;
  const avgEngagement = Math.round(sentiment.reduce((acc, s) => acc + s.score, 0) / sentiment.length);

  metricDuration.textContent = formatTime(Math.round(durationSec));
  metricTalkRatio.textContent = `${aTurns}:${bTurns}`;
  metricEngagement.textContent = `${avgEngagement}%`;
}

function formatTime(totalSec) {
  const mins = Math.floor(totalSec / 60);
  const secs = Math.floor(totalSec % 60)
    .toString()
    .padStart(2, '0');
  return `${mins}:${secs}`;
}
