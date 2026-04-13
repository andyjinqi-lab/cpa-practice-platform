<template>
  <section class="container profile-page">
    <div class="profile-grid">
      <div class="card user-card">
        <p class="eyebrow">学习中心</p>
        <h2>晚上好，测试用户</h2>
        <p>这里主要用于统一复盘错题与未作答题目，不做分数展示。</p>

        <div class="user-meta">
          <div>
            <strong>138****1234</strong>
            <span>绑定手机号</span>
          </div>
          <div>
            <strong>第 18 天</strong>
            <span>连续学习</span>
          </div>
          <div>
            <strong>{{ pendingReviewCount }} 题</strong>
            <span>待复盘题目</span>
          </div>
        </div>
      </div>

      <div class="card stats-card">
        <h3>错题复盘概览</h3>
        <div class="progress-item">
          <span>专业阶段</span>
          <strong>62%</strong>
        </div>
        <div class="progress-bar"><i style="width: 62%"></i></div>
        <div class="progress-item">
          <span>待复盘题目</span>
          <strong>{{ pendingReviewCount }} 题</strong>
        </div>
      </div>
    </div>

    <div v-if="latestReview" class="card review-card">
      <div class="review-head">
        <div>
          <p class="eyebrow">最新交卷</p>
          <h3>{{ latestReview.year }} 年 {{ latestReview.examName }}</h3>
          <p class="review-copy">以下内容优先用于错题与未作答复盘，不展示成绩分数。</p>
        </div>
        <div class="review-actions">
          <router-link :to="{ name: 'exam', params: { examId: latestReview.examId, year: latestReview.year } }" class="btn btn-secondary">
            返回练习页
          </router-link>
          <router-link :to="{ name: 'paper-detail', params: { examId: latestReview.examId, year: latestReview.year } }" class="btn btn-primary">
            查看原卷解析
          </router-link>
        </div>
      </div>

      <div class="review-summary">
        <div>
          <strong>{{ latestReview.answeredCount }}/{{ latestReview.totalQuestions }}</strong>
          <span>已作答</span>
        </div>
        <div>
          <strong>{{ latestReview.correctCount }}/{{ latestReview.answerKnownCount }}</strong>
          <span>客观题命中</span>
        </div>
        <div>
          <strong>{{ subjectiveAnsweredCount }}</strong>
          <span>主观题已填</span>
        </div>
      </div>

      <div class="filter-row">
        <button
          v-for="item in reviewFilters"
          :key="item.value"
          :class="['filter-btn', { active: activeFilter === item.value }]"
          @click="activeFilter = item.value"
        >
          {{ item.label }}
        </button>
      </div>

      <div class="review-list">
        <article v-for="question in filteredQuestions" :key="question.id" class="review-item">
          <div class="review-question-head">
            <div>
              <strong>{{ question.sectionName }} 第{{ question.number }}题</strong>
              <p>{{ question.stem }}</p>
            </div>
            <span :class="['result-tag', reviewTagClass(question)]">{{ reviewTagLabel(question) }}</span>
          </div>

          <div v-if="question.options?.length" class="review-answer-block">
            <p><span>你的答案：</span>{{ formatSelectedAnswer(question) }}</p>
            <p><span>参考答案：</span>{{ formatStandardAnswer(question) }}</p>
          </div>

          <div v-else class="review-answer-block">
            <p><span>你的作答：</span>{{ question.subjectiveAnswer?.trim() || '未填写' }}</p>
            <p><span>参考答案：</span>{{ question.analysis || '当前暂无结构化标准答案，请结合 PDF 解析复盘。' }}</p>
          </div>

          <p v-if="question.analysis && question.options?.length" class="analysis-copy">{{ question.analysis }}</p>
        </article>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue'

const reviewFilters = [
  { label: '未做答', value: 'unanswered' },
  { label: '仅错题', value: 'wrong' },
  { label: '仅客观题', value: 'objective' },
  { label: '仅主观题', value: 'subjective' }
]

const activeFilter = ref('wrong')
const storedReview = sessionStorage.getItem('latestPracticeReview')
const latestReview = ref(storedReview ? JSON.parse(storedReview) : null)

const pendingReviewCount = computed(() => {
  if (!latestReview.value) return 24
  return latestReview.value.questions.filter((question) => {
    if (question.options?.length) {
      const unanswered = !question.selectedOptions?.length
      const wrong = question.answer && !question.isCorrect
      return unanswered || wrong
    }
    return !question.subjectiveAnswer?.trim()
  }).length
})

const subjectiveAnsweredCount = computed(() => {
  if (!latestReview.value) return 0
  return latestReview.value.questions.filter(
    (question) => !question.options?.length && question.subjectiveAnswer?.trim()
  ).length
})

const filteredQuestions = computed(() => {
  if (!latestReview.value) return []

  if (activeFilter.value === 'unanswered') {
    return latestReview.value.questions.filter((question) => {
      if (question.options?.length) return !question.selectedOptions?.length
      return !question.subjectiveAnswer?.trim()
    })
  }

  if (activeFilter.value === 'wrong') {
    return latestReview.value.questions.filter(
      (question) =>
        question.options?.length &&
        question.answer &&
        question.selectedOptions?.length &&
        !question.isCorrect
    )
  }

  if (activeFilter.value === 'objective') {
    return latestReview.value.questions.filter((question) => question.options?.length)
  }

  if (activeFilter.value === 'subjective') {
    return latestReview.value.questions.filter((question) => !question.options?.length)
  }

  return latestReview.value.questions
})

function formatSelectedAnswer(question) {
  if (!question.selectedOptions?.length) return '未作答'
  return [...question.selectedOptions].sort().join('、')
}

function formatStandardAnswer(question) {
  if (!question.answer) return '暂无'
  return String(question.answer)
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .split('')
    .join('、')
}

function reviewTagClass(question) {
  if (!question.options?.length) {
    return question.subjectiveAnswer?.trim() ? 'written' : 'empty'
  }
  if (!question.selectedOptions?.length) return 'empty'
  if (!question.answer) return 'pending'
  return question.isCorrect ? 'correct' : 'wrong'
}

function reviewTagLabel(question) {
  if (!question.options?.length) {
    return question.subjectiveAnswer?.trim() ? '已作答' : '未作答'
  }
  if (!question.selectedOptions?.length) return '未作答'
  if (!question.answer) return '待校对'
  return question.isCorrect ? '正确' : '错误'
}
</script>

<style scoped>
.profile-page {
  padding-top: 3rem;
}

.profile-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.3fr) minmax(280px, 0.7fr);
  gap: 1.25rem;
  margin-bottom: 1.5rem;
}

.eyebrow {
  color: #d96c2f;
  font-weight: 800;
  margin-bottom: 0.5rem;
}

.user-meta,
.review-summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;
  margin-top: 1.5rem;
}

.user-meta div,
.review-summary div {
  padding: 1rem;
  border-radius: 18px;
  background: #f7f9fc;
}

.user-meta strong,
.review-summary strong {
  display: block;
  color: #08203a;
  font-size: 1.2rem;
}

.user-meta span,
.review-summary span,
.review-copy,
.analysis-copy {
  color: #69758a;
}

.progress-item,
.review-head,
.review-question-head {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
}

.progress-item {
  margin: 1rem 0 0.5rem;
}

.progress-bar {
  height: 12px;
  border-radius: 999px;
  background: #e9eff7;
  overflow: hidden;
}

.progress-bar i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(135deg, #ffb347, #ff7b54);
}

.review-card {
  margin-bottom: 1.5rem;
}

.review-actions,
.filter-row {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.review-summary {
  margin-bottom: 1rem;
}

.filter-row {
  margin-bottom: 1rem;
}

.filter-btn {
  border: 1px solid #d7e3f1;
  background: #fff;
  color: #0d5cab;
  border-radius: 999px;
  padding: 0.55rem 0.9rem;
  cursor: pointer;
  font-weight: 700;
}

.filter-btn.active {
  background: #0d5cab;
  color: #fff;
  border-color: #0d5cab;
}

.review-list {
  display: grid;
  gap: 1rem;
}

.review-item {
  padding: 1rem;
  border-radius: 20px;
  border: 1px solid #e7ecf3;
  background: #fff;
}

.review-question-head p {
  margin-top: 0.55rem;
  color: #42556d;
  line-height: 1.7;
}

.review-answer-block {
  margin-top: 0.9rem;
  display: grid;
  gap: 0.45rem;
}

.review-answer-block p {
  color: #31465f;
  line-height: 1.7;
}

.review-answer-block span {
  color: #69758a;
  font-weight: 700;
  margin-right: 0.4rem;
}

.analysis-copy {
  margin-top: 0.9rem;
  line-height: 1.8;
}

.result-tag {
  display: inline-flex;
  align-items: center;
  height: fit-content;
  padding: 0.4rem 0.75rem;
  border-radius: 999px;
  font-weight: 700;
}

.result-tag.correct {
  background: #eff8f1;
  color: #2b7b4d;
}

.result-tag.wrong {
  background: #fff0eb;
  color: #c75d38;
}

.result-tag.pending {
  background: #edf4ff;
  color: #355d9a;
}

.result-tag.written {
  background: #edf4ff;
  color: #355d9a;
}

.result-tag.empty {
  background: #f4f6fa;
  color: #8b96a8;
}

@media (max-width: 960px) {
  .profile-grid {
    grid-template-columns: 1fr;
  }

  .user-meta,
  .review-summary {
    grid-template-columns: 1fr;
  }
}
</style>
