<template>
  <section class="container practice-view">
    <div class="page-head">
      <div>
        <p class="eyebrow">真题题库</p>
        <h2>按科目进入历年真题</h2>
        <p class="page-desc">支持在线练习、真题详情、题目 PDF 与答案解析 PDF 预览。</p>
      </div>
      <div class="summary-panel">
        <div>
          <strong>{{ totalExamCount }}</strong>
          <span>套卷入口</span>
        </div>
        <div>
          <strong>{{ examYears.length }}</strong>
          <span>覆盖年份</span>
        </div>
        <div>
          <strong>PDF</strong>
          <span>题目与答案解析</span>
        </div>
      </div>
    </div>

    <div class="card tips-card">
      <div>
        <h3>练习建议</h3>
        <p>先看详情页确认原卷与答案，再进入限时练习，做完回到解析页复盘会更顺。</p>
      </div>
      <router-link
        :to="{ name: 'paper-detail', params: { examId: professionalExams[0].id, year: latestYear } }"
        class="btn btn-primary"
      >
        查看示例详情页
      </router-link>
    </div>

    <div class="section-block">
      <div class="section-head">
        <h3>专业阶段</h3>
        <p>6 科目，适合分科刷题与逐年回看答案解析。</p>
      </div>

      <div class="exam-grid">
        <article v-for="exam in professionalExams" :key="exam.id" class="card exam-card">
          <div class="exam-top">
            <span class="exam-tag">{{ exam.short }}</span>
            <span class="exam-duration">{{ exam.duration }}</span>
          </div>

          <h4>{{ exam.name }}</h4>
          <p class="exam-description">{{ exam.description }}</p>

          <div class="card-actions">
            <router-link
              :to="{ name: 'paper-detail', params: { examId: exam.id, year: latestYear } }"
              class="btn btn-secondary action-btn"
            >
              真题详情
            </router-link>
            <router-link
              :to="{ name: 'exam', params: { examId: exam.id, year: latestYear } }"
              class="btn btn-primary action-btn"
            >
              在线练习
            </router-link>
          </div>

          <div class="year-buttons">
            <router-link
              v-for="year in examYears"
              :key="`${exam.id}-${year}`"
              :to="{ name: 'paper-detail', params: { examId: exam.id, year } }"
              class="year-btn"
            >
              {{ year }}
            </router-link>
          </div>
        </article>
      </div>
    </div>

    <div v-if="comprehensiveExams.length" class="section-block">
      <div class="section-head">
        <h3>综合阶段</h3>
        <p>综合卷入口已预留；等你补充对应 PDF 后，详情页会自动承接预览。</p>
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

          <div class="card-actions">
            <router-link
              :to="{ name: 'paper-detail', params: { examId: exam.id, year: latestYear } }"
              class="btn btn-secondary action-btn"
            >
              真题详情
            </router-link>
            <router-link
              :to="{ name: 'exam', params: { examId: exam.id, year: latestYear } }"
              class="btn btn-primary action-btn"
            >
              在线练习
            </router-link>
          </div>

          <div class="year-buttons">
            <router-link
              v-for="year in examYears"
              :key="`${exam.id}-${year}`"
              :to="{ name: 'paper-detail', params: { examId: exam.id, year } }"
              class="year-btn"
            >
              {{ year }}
            </router-link>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { comprehensiveExams, examYears, professionalExams } from '../data/examLibrary'

const totalExamCount = computed(() => (professionalExams.length + comprehensiveExams.length) * examYears.length)
const latestYear = examYears[0]
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

.card-actions {
  display: flex;
  gap: 0.75rem;
  margin: 1rem 0 1.25rem;
  flex-wrap: wrap;
}

.action-btn {
  min-width: 120px;
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
  text-decoration: none;
  text-align: center;
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
