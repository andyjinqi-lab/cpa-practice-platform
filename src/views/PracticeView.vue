<template>
  <section class="container practice-view">
    <div class="page-head">
      <div>
        <p class="eyebrow">真题题库</p>
        <h2>按科目进入历年真题</h2>
        <p class="page-desc">支持专业阶段 6 科与综合阶段 2 卷，点击年份可直接进入模拟练习。</p>
      </div>
      <div class="summary-panel">
        <div>
          <strong>{{ totalExamCount }}</strong>
          <span>套卷入口</span>
        </div>
        <div>
          <strong>{{ years.length }}</strong>
          <span>覆盖年份</span>
        </div>
        <div>
          <strong>PDF</strong>
          <span>题目/答案可查看</span>
        </div>
      </div>
    </div>

    <div class="card tips-card">
      <div>
        <h3>练习建议</h3>
        <p>如果你在冲刺阶段，建议先做 2025、2024、2023 三年真题，再回看更早年份查漏补缺。</p>
      </div>
      <router-link to="/profile" class="btn btn-primary">查看近期进度</router-link>
    </div>

    <div class="section-block">
      <div class="section-head">
        <h3>专业阶段</h3>
        <p>6 科目，适合分科刷题与阶段突破。</p>
      </div>

      <div class="exam-grid">
        <article v-for="exam in professionalExams" :key="exam.id" class="card exam-card">
          <div class="exam-top">
            <span class="exam-tag">{{ exam.short }}</span>
            <span class="exam-duration">{{ exam.duration }}</span>
          </div>
          <h4>{{ exam.name }}</h4>
          <p class="exam-description">{{ exam.description }}</p>

          <div class="paper-links">
            <a :href="buildPdfLink(exam, latestYear, 'question')" target="_blank" rel="noreferrer">最新题目 PDF</a>
            <a :href="buildPdfLink(exam, latestYear, 'answer')" target="_blank" rel="noreferrer">最新答案 PDF</a>
          </div>

          <div class="year-buttons">
            <button
              v-for="year in years"
              :key="`${exam.id}-${year}`"
              class="year-btn"
              @click="startExam(exam.id, year)"
            >
              {{ year }}
            </button>
          </div>
        </article>
      </div>
    </div>

    <div class="section-block">
      <div class="section-head">
        <h3>综合阶段</h3>
        <p>整卷训练，更适合通关专业阶段后的综合模拟。</p>
      </div>

      <div class="exam-grid">
        <article v-for="exam in comprehensiveExams" :key="exam.id" class="card exam-card">
          <div class="exam-top">
            <span class="exam-tag">{{ exam.short }}</span>
            <span class="exam-duration">{{ exam.duration }}</span>
          </div>
          <h4>{{ exam.name }}</h4>
          <p class="exam-description">{{ exam.description }}</p>
          <p class="exam-content">{{ exam.content }}</p>

          <div class="paper-links">
            <template v-if="hasPdf(exam)">
              <a :href="buildPdfLink(exam, latestYear, 'question')" target="_blank" rel="noreferrer">最新题目 PDF</a>
              <a :href="buildPdfLink(exam, latestYear, 'answer')" target="_blank" rel="noreferrer">最新答案 PDF</a>
            </template>
            <span v-else class="paper-placeholder">综合卷 PDF 资料待补充</span>
          </div>

          <div class="year-buttons">
            <button
              v-for="year in years"
              :key="`${exam.id}-${year}`"
              class="year-btn"
              @click="startExam(exam.id, year)"
            >
              {{ year }}
            </button>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const years = ref(Array.from({ length: 13 }, (_, index) => 2025 - index))

const professionalExams = ref([
  {
    id: 1,
    short: '会计',
    name: 'CPA 会计真题',
    description: '核心难度最高，建议优先建立章节知识框架后再刷整卷。',
    duration: '180 分钟',
    pdfDirectory: 'accounting',
    fileKeyword: '会计'
  },
  {
    id: 2,
    short: '审计',
    name: 'CPA 审计真题',
    description: '适合搭配审计流程图与高频关键词一起练习，提升做题定位速度。',
    duration: '150 分钟',
    pdfDirectory: 'audit',
    fileKeyword: '审计'
  },
  {
    id: 3,
    short: '财管',
    name: 'CPA 财务成本管理真题',
    description: '计算密度高，建议整卷计时训练，重点关注公式切换和题速控制。',
    duration: '150 分钟',
    pdfDirectory: 'finance',
    fileKeyword: '财务成本管理'
  },
  {
    id: 4,
    short: '税法',
    name: 'CPA 税法真题',
    description: '适合按税种复盘错题，再做整卷巩固综合计算题。',
    duration: '120 分钟',
    pdfDirectory: 'tax',
    fileKeyword: '税法'
  },
  {
    id: 5,
    short: '经济法',
    name: 'CPA 经济法真题',
    description: '偏法条理解与记忆，适合通过真题回收高频法条考法。',
    duration: '120 分钟',
    pdfDirectory: 'law',
    fileKeyword: '经济法'
  },
  {
    id: 6,
    short: '战略',
    name: 'CPA 公司战略与风险管理真题',
    description: '内容相对集中，适合短周期冲刺和主观题答题结构训练。',
    duration: '120 分钟',
    pdfDirectory: 'strategy',
    fileKeyword: '公司战略与风险管理'
  }
])

const comprehensiveExams = ref([
  {
    id: 7,
    short: '综合一',
    name: '职业能力综合测试（试卷一）',
    description: '聚焦会计、审计、税法的综合案例分析与职业判断。',
    content: '偏鉴证业务场景',
    duration: '210 分钟',
    pdfDirectory: 'comprehensive',
    fileKeyword: '综合阶段试卷一'
  },
  {
    id: 8,
    short: '综合二',
    name: '职业能力综合测试（试卷二）',
    description: '覆盖财管、战略、经济法相关综合题型，强调管理视角。',
    content: '偏管理咨询场景',
    duration: '210 分钟',
    pdfDirectory: 'comprehensive',
    fileKeyword: '综合阶段试卷二'
  }
])

const totalExamCount = computed(
  () => (professionalExams.value.length + comprehensiveExams.value.length) * years.value.length
)
const latestYear = computed(() => years.value[0])

const startExam = (examId, year) => {
  router.push({ name: 'exam', params: { examId, year } })
}

const buildPdfLink = (exam, year, type) => {
  const combinedYearsByDirectory = {
    accounting: [2024, 2025],
    audit: [2024, 2025],
    finance: [2024, 2025],
    law: [2024, 2025],
    strategy: [2024, 2025],
    tax: [2013, 2014, 2015, 2024, 2025]
  }

  if ((combinedYearsByDirectory[exam.pdfDirectory] || []).includes(year) || exam.pdfDirectory === 'comprehensive') {
    return `/pdf/${exam.pdfDirectory}/${year}_${exam.fileKeyword}_题目和答案.pdf`
  }

  const suffix = type === 'question' ? '题目' : '答案'
  return `/pdf/${exam.pdfDirectory}/${year}_${exam.fileKeyword}_${suffix}.pdf`
}

const hasPdf = (exam) => exam.pdfDirectory !== 'comprehensive'
</script>

<style scoped>
.practice-view {
  padding-top: 3rem;
}

.page-head {
  display: flex;
  justify-content: space-between;
  gap: 1.5rem;
  align-items: flex-end;
  margin-bottom: 2rem;
}

.eyebrow {
  color: #d96c2f;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin-bottom: 0.5rem;
}

.page-head h2 {
  font-size: 2.2rem;
  margin-bottom: 0.75rem;
}

.page-desc {
  color: #5b6574;
  max-width: 48rem;
}

.summary-panel {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.8rem;
  min-width: 300px;
}

.summary-panel div {
  padding: 1rem;
  border-radius: 20px;
  background: linear-gradient(180deg, #fff9f4, #fff);
  border: 1px solid #f3dccd;
}

.summary-panel strong {
  display: block;
  font-size: 1.5rem;
  color: #08203a;
}

.summary-panel span {
  color: #69758a;
  font-size: 0.92rem;
}

.tips-card {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: center;
}

.section-block {
  margin-top: 2.4rem;
}

.section-head {
  margin-bottom: 1rem;
}

.section-head p {
  color: #69758a;
}

.exam-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1.25rem;
}

.exam-card {
  border: 1px solid #e7ecf3;
}

.exam-top {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: center;
  margin-bottom: 1rem;
}

.exam-tag {
  display: inline-flex;
  padding: 0.35rem 0.7rem;
  border-radius: 999px;
  background: #fff1e7;
  color: #d96c2f;
  font-weight: 700;
}

.exam-duration {
  color: #69758a;
  font-size: 0.92rem;
}

.exam-card h4 {
  font-size: 1.25rem;
  margin-bottom: 0.7rem;
}

.exam-description,
.exam-content {
  color: #5b6574;
}

.paper-links {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  margin: 1rem 0 1.25rem;
}

.paper-links a {
  color: #0d5cab;
  font-weight: 600;
  text-decoration: none;
}

.paper-placeholder {
  color: #8b96a8;
}

.year-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
}

.year-btn {
  min-width: 74px;
  padding: 0.55rem 0.8rem;
  border: 1px solid #d7e3f1;
  border-radius: 12px;
  background: #f8fbff;
  color: #0d5cab;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
}

.year-btn:hover {
  background: #0d5cab;
  border-color: #0d5cab;
  color: #fff;
  transform: translateY(-1px);
}

@media (max-width: 960px) {
  .page-head,
  .tips-card {
    flex-direction: column;
    align-items: flex-start;
  }

  .summary-panel,
  .exam-grid {
    grid-template-columns: 1fr;
    width: 100%;
  }
}
</style>
