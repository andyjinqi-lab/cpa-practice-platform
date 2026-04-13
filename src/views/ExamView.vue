<template>
  <section class="container exam-page">
    <div class="page-head">
      <div>
        <p class="eyebrow">在线练习</p>
        <h2>{{ exam.name }}</h2>
        <p class="page-copy">{{ year }} 年 · {{ exam.duration }} · {{ pageSummary }}</p>
      </div>
      <div class="page-actions">
        <router-link :to="{ name: 'paper-detail', params: { examId: exam.id, year } }" class="btn btn-secondary">
          查看原卷与解析
        </router-link>
        <router-link to="/practice" class="btn btn-secondary">
          返回题库
        </router-link>
      </div>
    </div>

    <div v-if="isLoading" class="card state-card">
      <h3>题库加载中</h3>
      <p>正在读取 {{ year }} 年 {{ exam.short }} 真题，请稍候。</p>
    </div>

    <div v-else-if="loadError" class="card state-card">
      <h3>题库加载失败</h3>
      <p>{{ loadError }}</p>
      <button class="btn btn-primary" @click="loadQuestionBank">重新加载</button>
    </div>

    <div v-else-if="!supportsStructuredPractice" class="card state-card">
      <h3>该科目题库还在整理中</h3>
      <p>当前在线练习已接入会计、审计、财管、税法、经济法、战略真题。你现在访问的是 {{ exam.name }}，可以先去详情页查看原卷和答案解析。</p>
      <router-link :to="{ name: 'paper-detail', params: { examId: exam.id, year } }" class="btn btn-primary">
        前往真题详情
      </router-link>
    </div>

    <div v-else-if="!questions.length" class="card state-card">
      <h3>{{ year }} 年暂未生成结构化题库</h3>
      <p>PDF 已保留，后续补齐文本切题后，这里会自动切换成可作答模式。</p>
      <router-link :to="{ name: 'paper-detail', params: { examId: exam.id, year } }" class="btn btn-primary">
        查看该年 PDF
      </router-link>
    </div>

    <div v-else class="exam-shell">
      <aside class="sidebar card">
        <div class="sidebar-head">
          <p class="eyebrow">练习面板</p>
          <h3>{{ exam.short }} · {{ year }}</h3>
          <p>{{ totalQuestions }} 题 · 已解析 {{ answerKnownCount }} 题</p>
        </div>

        <div class="timer-card" :class="{ warning: timeLeft <= 900 }">
          <span>剩余时间</span>
          <strong>{{ formattedTime }}</strong>
          <button class="btn pause-btn" @click="togglePause" :disabled="submitted">
            {{ isPaused ? '继续计时' : '暂停计时' }}
          </button>
        </div>

        <div class="status-grid">
          <div>
            <strong>{{ answeredCount }}</strong>
            <span>已作答</span>
          </div>
          <div>
            <strong>{{ markedCount }}</strong>
            <span>已标记</span>
          </div>
          <div>
            <strong>{{ remainingCount }}</strong>
            <span>未作答</span>
          </div>
        </div>

        <div v-if="submitted && answerKnownCount" class="result-card">
          <span>判分结果</span>
          <strong>{{ correctCount }} / {{ answerKnownCount }}</strong>
          <p>仅统计已识别出标准答案的题目。</p>
        </div>

        <div class="number-grid">
          <button
            v-for="(question, index) in questions"
            :key="question.id"
            :class="[
              'number-btn',
              {
                current: index === currentIndex,
                answered: hasSelection(question),
                marked: question.marked,
                correct: submitted && isQuestionCorrect(question),
                wrong: submitted && hasJudgement(question) && !isQuestionCorrect(question)
              }
            ]"
            @click="goToQuestion(index)"
          >
            {{ questionBadge(question) }}
          </button>
        </div>
      </aside>

      <div class="content card">
        <div class="content-head">
          <div>
            <p class="question-index">第 {{ currentIndex + 1 }} / {{ totalQuestions }} 题</p>
            <h3>{{ currentQuestion.title }}</h3>
          </div>
          <button class="btn mark-btn" @click="toggleMark(currentQuestion.id)">
            {{ currentQuestion.marked ? '取消标记' : '标记此题' }}
          </button>
        </div>

        <div class="question-meta">
          <span>{{ currentQuestion.sectionName }}</span>
          <span>{{ questionTypeLabel(currentQuestion.type) }}</span>
          <a v-if="pdfAssets.available" :href="pdfAssets.question" target="_blank" rel="noreferrer">查看原卷 PDF</a>
          <router-link :to="{ name: 'paper-detail', params: { examId: exam.id, year } }">查看该年解析页</router-link>
        </div>

        <div class="question-body">
          <p>{{ currentQuestion.stem }}</p>

          <div v-if="!currentQuestion.options.length" class="subjective-panel">
            <div class="subjective-tip">
              主观题支持在线输入练习，适合先独立作答，再展开答案解析做复盘。
            </div>
            <textarea
              class="subjective-answer"
              :value="currentQuestion.subjectiveAnswer"
              :disabled="submitted"
              placeholder="在这里输入你的作答内容，可以按题目步骤分点作答。"
              @input="updateSubjectiveAnswer(currentQuestion.id, $event.target.value)"
            />
          </div>

          <label
            v-for="option in currentQuestion.options"
            :key="option.key"
            class="option-card"
            :class="optionClass(option.key)"
          >
            <input
              :checked="currentQuestion.selectedOptions.includes(option.key)"
              :type="currentQuestion.type === 'multiple' ? 'checkbox' : 'radio'"
              :name="`question-${currentQuestion.id}`"
              :value="option.key"
              :disabled="submitted"
              @change="selectOption(currentQuestion.id, option.key, currentQuestion.type)"
            >
            <span class="option-key">{{ option.key }}</span>
            <span>{{ option.text }}</span>
          </label>
        </div>

        <div class="navigation-row">
          <button class="btn btn-secondary nav-btn" @click="prevQuestion" :disabled="isFirstQuestion">
            上一题
          </button>
          <button class="btn btn-secondary nav-btn" @click="nextQuestion" :disabled="isLastQuestion">
            下一题
          </button>
          <button class="btn submit-btn" @click="showSubmitModal = true" :disabled="submitted">
            提交本次练习
          </button>
        </div>

        <div class="analysis-bar">
          <button
            class="btn btn-secondary analysis-toggle"
            @click="showAnalysis = !showAnalysis"
            :disabled="!hasExplanation(currentQuestion)"
          >
            {{ showAnalysis ? '收起答案解析' : '查看答案解析' }}
          </button>
          <span v-if="!hasExplanation(currentQuestion)" class="analysis-tip">这题暂未识别出标准答案或解析。</span>
        </div>

        <article v-if="showAnalysis && hasExplanation(currentQuestion)" class="analysis-card">
          <div class="analysis-head">
            <strong>参考答案</strong>
            <span>{{ formatAnswer(currentQuestion.answer) }}</span>
          </div>
          <p v-if="currentQuestion.analysis">{{ currentQuestion.analysis }}</p>
          <p v-else>当前只识别到了标准答案，解析内容还未从 PDF 中稳定切出。</p>
        </article>
      </div>
    </div>

    <div v-if="showSubmitModal" class="modal-overlay">
      <div class="modal card">
        <h3>确认提交</h3>
        <div class="submit-summary">
          <div>
            <strong>{{ remainingCount }}</strong>
            <span>题未答</span>
          </div>
          <div>
            <strong>{{ answeredCount }}</strong>
            <span>题已答</span>
          </div>
          <div>
            <strong>{{ markedCount }}</strong>
            <span>题待定</span>
          </div>
        </div>
        <p>确认后将结束本次练习，并跳转到个人中心查看答案对比与复盘结果。</p>
        <div class="modal-actions">
          <button class="btn btn-secondary nav-btn" @click="showSubmitModal = false">继续检查</button>
          <button class="btn submit-btn" @click="confirmSubmit">确认提交</button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getExamById, getPdfAssets } from '../data/examLibrary'
import { getSessionEmail, getUserScopedKey } from '../services/auth'

const route = useRoute()
const router = useRouter()

const practiceSourceByExamId = {
  1: '/data/accounting-question-bank.json',
  2: '/data/audit-question-bank.json',
  3: '/data/finance-question-bank.json',
  4: '/data/tax-question-bank.json',
  5: '/data/law-question-bank.json',
  6: '/data/strategy-question-bank.json'
}
const durationSecondsByMinutes = {
  120: 120 * 60,
  150: 150 * 60,
  180: 180 * 60,
  210: 210 * 60
}

const routeExamId = computed(() => Number(route.params.examId))
const year = computed(() => Number(route.params.year))
const exam = computed(() => getExamById(route.params.examId))
const pdfAssets = computed(() => getPdfAssets(exam.value, year.value))
const supportsStructuredPractice = computed(() => Boolean(practiceSourceByExamId[routeExamId.value]))

const questionBank = ref(null)
const questionBankSource = ref('')
const questions = ref([])
const isLoading = ref(false)
const loadError = ref('')
const isPaused = ref(false)
const submitted = ref(false)
const showSubmitModal = ref(false)
const showAnalysis = ref(false)
const currentIndex = ref(0)
const timeLeft = ref(0)
let timer = null

const parseDurationMinutes = (durationText) => Number(String(durationText).replace(/[^\d]/g, '')) || 120

const resetTimer = () => {
  const minutes = parseDurationMinutes(exam.value.duration)
  timeLeft.value = durationSecondsByMinutes[minutes] || durationSecondsByMinutes[120]
  isPaused.value = false
}

const cloneQuestion = (question) => ({
  ...question,
  selectedOptions: [],
  marked: false,
  subjectiveAnswer: ''
})

const buildQuestionList = () => {
  if (!questionBank.value || !supportsStructuredPractice.value) {
    questions.value = []
    currentIndex.value = 0
    return
  }

  const matches = questionBank.value.questions
    .filter((question) => question.year === year.value)
    .sort((left, right) => {
      const sectionGap = (left.sectionOrder || 99) - (right.sectionOrder || 99)
      if (sectionGap !== 0) {
        return sectionGap
      }
      return left.number - right.number
    })
    .map(cloneQuestion)

  questions.value = matches
  currentIndex.value = 0
}

const loadQuestionBank = async () => {
  loadError.value = ''

  if (!supportsStructuredPractice.value) {
    questions.value = []
    return
  }

  isLoading.value = true

  try {
    const source = practiceSourceByExamId[routeExamId.value]

    if (!questionBank.value || questionBankSource.value !== source) {
      const response = await fetch(source)
      if (!response.ok) {
        throw new Error(`题库文件读取失败：${response.status}`)
      }
      questionBank.value = await response.json()
      questionBankSource.value = source
    }

    buildQuestionList()
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : '题库加载失败，请稍后重试。'
  } finally {
    isLoading.value = false
  }
}

const currentQuestion = computed(() => questions.value[currentIndex.value] || null)
const totalQuestions = computed(() => questions.value.length)
const answeredCount = computed(() => questions.value.filter((question) => hasSelection(question)).length)
const markedCount = computed(() => questions.value.filter((question) => question.marked).length)
const remainingCount = computed(() => totalQuestions.value - answeredCount.value)
const answerKnownCount = computed(() => questions.value.filter((question) => Boolean(question.answer)).length)
const correctCount = computed(() => questions.value.filter((question) => isQuestionCorrect(question)).length)
const isFirstQuestion = computed(() => currentIndex.value === 0)
const isLastQuestion = computed(() => currentIndex.value === totalQuestions.value - 1)
const pageSummary = computed(() => {
  if (!supportsStructuredPractice.value) return '题库解析中，当前先保留 PDF 详情入口'
  if (!questions.value.length) return '结构化题库尚未覆盖该年份'
  return `共 ${totalQuestions.value} 题，可在线作答并查看答案解析`
})

const formattedTime = computed(() => {
  const hours = Math.floor(timeLeft.value / 3600)
  const minutes = Math.floor((timeLeft.value % 3600) / 60)
  const seconds = timeLeft.value % 60
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':')
})

function normalizeAnswer(answer) {
  return String(answer || '')
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .split('')
    .sort()
}

function formatAnswer(answer) {
  const letters = normalizeAnswer(answer)
  return letters.length ? letters.join('、') : '暂无'
}

function questionBadge(question) {
  const prefixMap = {
    single: '单',
    multiple: '多',
    analysis: '计',
    case: '综'
  }
  return `${prefixMap[question.type] || ''}${question.number}`
}

function questionTypeLabel(type) {
  const labelMap = {
    single: '单选题',
    multiple: '多选题',
    analysis: '计算分析题',
    case: '综合题'
  }
  return labelMap[type] || '试题'
}

function hasSelection(question) {
  return Boolean(question?.selectedOptions?.length || question?.subjectiveAnswer?.trim())
}

function hasExplanation(question) {
  return Boolean(question?.answer || question?.analysis)
}

function hasJudgement(question) {
  return Boolean(question?.answer)
}

function isQuestionCorrect(question) {
  if (!question?.answer) return false

  const expected = normalizeAnswer(question.answer)
  const selected = [...question.selectedOptions].sort()
  return expected.length > 0 && expected.join('') === selected.join('')
}

function optionClass(optionKey) {
  if (!currentQuestion.value) return {}

  const selected = currentQuestion.value.selectedOptions.includes(optionKey)
  const classes = { selected }

  if (!submitted.value || !currentQuestion.value.answer) {
    return classes
  }

  const correctOptions = normalizeAnswer(currentQuestion.value.answer)
  return {
    ...classes,
    correct: correctOptions.includes(optionKey),
    wrong: selected && !correctOptions.includes(optionKey)
  }
}

const togglePause = () => {
  if (submitted.value) return
  isPaused.value = !isPaused.value
}

const goToQuestion = (index) => {
  currentIndex.value = index
  showAnalysis.value = submitted.value && hasExplanation(questions.value[index])
}

const prevQuestion = () => {
  if (!isFirstQuestion.value) {
    goToQuestion(currentIndex.value - 1)
  }
}

const nextQuestion = () => {
  if (!isLastQuestion.value) {
    goToQuestion(currentIndex.value + 1)
  }
}

const selectOption = (questionId, optionKey, type) => {
  const target = questions.value.find((question) => question.id === questionId)
  if (!target || submitted.value) return

  if (type === 'multiple') {
    target.selectedOptions = target.selectedOptions.includes(optionKey)
      ? target.selectedOptions.filter((item) => item !== optionKey)
      : [...target.selectedOptions, optionKey].sort()
    return
  }

  target.selectedOptions = [optionKey]
}

const toggleMark = (questionId) => {
  const target = questions.value.find((question) => question.id === questionId)
  if (target) {
    target.marked = !target.marked
  }
}

const updateSubjectiveAnswer = (questionId, value) => {
  const target = questions.value.find((question) => question.id === questionId)
  if (!target || submitted.value) return
  target.subjectiveAnswer = value
}

const confirmSubmit = () => {
  submitted.value = true
  showSubmitModal.value = false
  showAnalysis.value = hasExplanation(currentQuestion.value)
  isPaused.value = true

  const reviewPayload = {
    examId: exam.value.id,
    examName: exam.value.name,
    examShort: exam.value.short,
    year: year.value,
    submittedAt: new Date().toISOString(),
    totalQuestions: totalQuestions.value,
    answeredCount: answeredCount.value,
    answerKnownCount: answerKnownCount.value,
    correctCount: correctCount.value,
    questions: questions.value.map((question) => ({
      id: question.id,
      title: question.title,
      type: question.type,
      sectionName: question.sectionName,
      number: question.number,
      stem: question.stem,
      options: question.options,
      answer: question.answer,
      analysis: question.analysis,
      selectedOptions: question.selectedOptions,
      subjectiveAnswer: question.subjectiveAnswer,
      marked: question.marked,
      isCorrect: isQuestionCorrect(question)
    }))
  }

  const sessionEmail = getSessionEmail()
  const latestKey = getUserScopedKey('latestPracticeReview', sessionEmail)
  const historyKey = getUserScopedKey('practiceReviewHistory', sessionEmail)

  localStorage.setItem(latestKey, JSON.stringify(reviewPayload))

  try {
    const rawHistory = localStorage.getItem(historyKey)
    const history = rawHistory ? JSON.parse(rawHistory) : []
    const deduped = Array.isArray(history)
      ? history.filter(
          (item) => !(Number(item?.examId) === Number(reviewPayload.examId) && Number(item?.year) === Number(reviewPayload.year))
        )
      : []
    localStorage.setItem(historyKey, JSON.stringify([reviewPayload, ...deduped].slice(0, 120)))
  } catch (error) {
    console.warn('practice review history save failed:', error)
  }

  router.push({ name: 'profile', query: { source: 'exam-review' } })
}

const startTimer = () => {
  timer = setInterval(() => {
    if (!isPaused.value && !submitted.value && timeLeft.value > 0) {
      timeLeft.value -= 1
      if (timeLeft.value === 0) {
        confirmSubmit()
      }
    }
  }, 1000)
}

const stopTimer = () => {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

watch(
  () => [route.params.examId, route.params.year],
  async () => {
    submitted.value = false
    showSubmitModal.value = false
    showAnalysis.value = false
    resetTimer()
    await loadQuestionBank()
  },
  { immediate: true }
)

onMounted(() => {
  resetTimer()
  startTimer()
})

onUnmounted(() => {
  stopTimer()
})
</script>

<style scoped>
.exam-page {
  padding-top: 3rem;
}

.page-head {
  display: flex;
  justify-content: space-between;
  gap: 1.25rem;
  align-items: flex-end;
  margin-bottom: 1.5rem;
}

.eyebrow {
  color: #d96c2f;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin-bottom: 0.45rem;
}

.page-copy {
  color: #5b6574;
  margin-top: 0.75rem;
}

.page-actions {
  display: flex;
  gap: 0.8rem;
  flex-wrap: wrap;
}

.state-card {
  border: 1px solid #e7ecf3;
  text-align: center;
}

.state-card h3 {
  margin-bottom: 0.75rem;
}

.state-card p {
  color: #607086;
  margin-bottom: 1rem;
}

.exam-shell {
  display: grid;
  grid-template-columns: 300px minmax(0, 1fr);
  gap: 1.5rem;
}

.sidebar,
.content {
  border: 1px solid #e7ecf3;
}

.sidebar-head p:last-child {
  color: #69758a;
  margin-top: 0.6rem;
}

.timer-card,
.result-card {
  margin: 1.5rem 0;
  padding: 1.2rem;
  border-radius: 22px;
}

.timer-card {
  background: linear-gradient(180deg, #f5f9ff, #eef5ff);
}

.timer-card.warning {
  background: linear-gradient(180deg, #fff4ec, #fff1e8);
}

.result-card {
  background: linear-gradient(180deg, #eef9f1, #f7fcf8);
  border: 1px solid #d3ecd9;
}

.timer-card span,
.status-grid span,
.result-card span {
  display: block;
  color: #69758a;
}

.timer-card strong,
.result-card strong {
  display: block;
  font-size: 2rem;
  margin: 0.4rem 0 0.9rem;
  color: #08203a;
}

.result-card p {
  color: #607086;
  font-size: 0.92rem;
}

.pause-btn,
.submit-btn {
  width: 100%;
}

.pause-btn {
  background: #0d5cab;
  color: #fff;
}

.status-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.7rem;
}

.status-grid div {
  padding: 0.9rem 0.8rem;
  border-radius: 18px;
  background: #f7f9fc;
}

.status-grid strong {
  display: block;
  font-size: 1.35rem;
  color: #08203a;
}

.number-grid {
  margin-top: 1.5rem;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.65rem;
}

.number-btn {
  width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: 14px;
  border: 1px solid #d7e3f1;
  background: #fff;
  color: #27405d;
  font-weight: 700;
  cursor: pointer;
}

.number-btn.current {
  background: #0d5cab;
  color: #fff;
  border-color: #0d5cab;
}

.number-btn.answered {
  background: #eff9f1;
  border-color: #89cca0;
}

.number-btn.marked {
  box-shadow: inset 0 0 0 2px #ffb347;
}

.number-btn.correct {
  background: #eaf7ee;
  border-color: #58b27c;
}

.number-btn.wrong {
  background: #fff0ec;
  border-color: #ff8c6a;
}

.content-head {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.question-index {
  color: #69758a;
  font-weight: 700;
  margin-bottom: 0.5rem;
}

.question-meta {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  margin-bottom: 1.25rem;
}

.question-meta span,
.question-meta a {
  display: inline-flex;
  align-items: center;
  padding: 0.45rem 0.8rem;
  border-radius: 999px;
  background: #f7f9fc;
  color: #44617f;
  text-decoration: none;
}

.question-body p {
  font-size: 1.08rem;
  line-height: 1.8;
  color: #24374d;
  margin-bottom: 1.25rem;
}

.subjective-tip {
  margin-bottom: 1rem;
  padding: 0.95rem 1rem;
  border-radius: 16px;
  background: #fff7ef;
  color: #8b5b36;
  border: 1px solid #ffd9b8;
}

.subjective-panel {
  display: grid;
  gap: 0.9rem;
}

.subjective-answer {
  min-height: 220px;
  resize: vertical;
  border-radius: 18px;
  border: 1px solid #d7e3f1;
  padding: 1rem 1.05rem;
  font: inherit;
  line-height: 1.7;
  color: #24374d;
  background: #fff;
}

.subjective-answer:focus {
  outline: 2px solid rgba(13, 92, 171, 0.18);
  border-color: #0d5cab;
}

.subjective-answer:disabled {
  background: #f7f9fc;
  color: #617286;
}

.option-card {
  display: grid;
  grid-template-columns: auto auto 1fr;
  gap: 0.9rem;
  align-items: flex-start;
  padding: 1rem 1.1rem;
  border-radius: 18px;
  border: 1px solid #dde7f2;
  background: #fff;
  margin-bottom: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.option-card.selected {
  border-color: #0d5cab;
  background: #f4f9ff;
}

.option-card.correct {
  border-color: #58b27c;
  background: #eff8f1;
}

.option-card.wrong {
  border-color: #ff8c6a;
  background: #fff2ee;
}

.option-card input {
  margin-top: 0.15rem;
}

.option-key {
  color: #0d5cab;
  font-weight: 800;
}

.mark-btn {
  background: #fff1e7;
  color: #d96c2f;
  border: 1px solid #ffd2b3;
}

.navigation-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;
  margin-top: 2rem;
}

.nav-btn {
  width: 100%;
  justify-content: center;
}

.submit-btn {
  background: linear-gradient(135deg, #ffb347, #ff7b54);
  color: #08203a;
  font-weight: 800;
}

.analysis-bar {
  display: flex;
  gap: 0.9rem;
  align-items: center;
  flex-wrap: wrap;
  margin-top: 1.25rem;
}

.analysis-toggle {
  min-width: 148px;
}

.analysis-tip {
  color: #8a96a8;
}

.analysis-card {
  margin-top: 1rem;
  padding: 1.2rem;
  border-radius: 22px;
  border: 1px solid #dbe7f5;
  background: #f8fbff;
}

.analysis-head {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.8rem;
}

.analysis-card p {
  color: #42556d;
  line-height: 1.8;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(7, 18, 31, 0.56);
  display: grid;
  place-items: center;
  padding: 1rem;
}

.modal {
  max-width: 460px;
  width: 100%;
}

.modal h3 {
  margin-bottom: 1rem;
}

.modal p {
  color: #506073;
  margin-bottom: 0.8rem;
}

.submit-summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.8rem;
  margin-bottom: 1rem;
}

.submit-summary div {
  padding: 0.9rem 0.8rem;
  border-radius: 16px;
  background: #f7f9fc;
  text-align: center;
}

.submit-summary strong {
  display: block;
  color: #08203a;
  font-size: 1.5rem;
}

.submit-summary span {
  color: #69758a;
}

.modal-actions {
  display: flex;
  gap: 1rem;
  margin-top: 1.5rem;
}

@media (max-width: 960px) {
  .page-head,
  .exam-shell {
    grid-template-columns: 1fr;
    display: grid;
  }
}

@media (max-width: 640px) {
  .status-grid,
  .submit-summary,
  .navigation-row,
  .modal-actions {
    grid-template-columns: 1fr;
    display: grid;
  }

  .content-head,
  .analysis-head {
    flex-direction: column;
  }
}
</style>
