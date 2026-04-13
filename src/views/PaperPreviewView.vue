<template>
  <section class="container detail-page">
    <div class="detail-hero card">
      <div>
        <p class="eyebrow">真题详情</p>
        <h2>{{ exam.name }}</h2>
        <p class="detail-copy">{{ year }} 年 · {{ exam.duration }} · {{ exam.description }}</p>
      </div>

      <div class="hero-actions">
        <router-link :to="{ name: 'exam', params: { examId: exam.id, year } }" class="btn btn-primary">
          开始在线练习
        </router-link>
        <router-link to="/practice" class="btn btn-secondary">
          返回题库
        </router-link>
      </div>
    </div>

    <div class="toolbar card">
      <div class="year-picker">
        <span>年份切换</span>
        <div class="year-buttons">
          <button
            v-for="item in examYears"
            :key="item"
            :class="['year-btn', { active: item === year }]"
            @click="goToYear(item)"
          >
            {{ item }}
          </button>
        </div>
      </div>

      <div class="preview-switch">
        <button
          :class="['switch-btn', { active: currentPreview === 'question' }]"
          @click="currentPreview = 'question'"
          :disabled="!pdfAssets.available"
        >
          题目原卷
        </button>
        <button
          :class="['switch-btn', { active: currentPreview === 'answer' }]"
          @click="currentPreview = 'answer'"
          :disabled="!pdfAssets.available"
        >
          答案解析
        </button>
      </div>
    </div>

    <div class="detail-grid">
      <article class="card summary-card">
        <h3>资料说明</h3>
        <ul class="info-list">
          <li>资料年份：{{ year }} 年</li>
          <li>考试时长：{{ exam.duration }}</li>
          <li>资料形式：{{ assetLabel }}</li>
          <li>复盘建议：先做整卷，再切到答案页核对错因与得分点。</li>
        </ul>

        <div v-if="pdfAssets.available" class="download-group">
          <a :href="pdfAssets.question" target="_blank" rel="noreferrer" class="btn btn-secondary">
            打开题目 PDF
          </a>
          <a :href="pdfAssets.answer" target="_blank" rel="noreferrer" class="btn btn-secondary">
            打开答案 PDF
          </a>
        </div>

        <p v-else class="empty-copy">
          当前这套资料还没有放到 `public/pdf`，补齐后会自动沿用这一页的预览逻辑。
        </p>
      </article>

      <article class="card preview-card">
        <div class="preview-head">
          <div>
            <p class="eyebrow">{{ currentPreview === 'question' ? '题目预览' : '答案解析' }}</p>
            <h3>{{ currentPreviewTitle }}</h3>
          </div>
          <a
            v-if="currentPreviewSrc"
            :href="currentPreviewSrc"
            target="_blank"
            rel="noreferrer"
            class="btn btn-primary"
          >
            新窗口打开
          </a>
        </div>

        <div v-if="currentPreviewSrc" class="pdf-frame-wrap">
          <iframe :src="currentPreviewSrc" :title="currentPreviewTitle" class="pdf-frame" />
        </div>

        <div v-else class="preview-empty">
          <strong>该年份暂无可预览 PDF</strong>
          <p>文件名符合 `{年份}_{科目}_题目.pdf`、`答案.pdf` 或 `题目和答案.pdf` 即可被识别。</p>
        </div>
      </article>
    </div>
  </section>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { examYears, getExamById, getPdfAssets } from '../data/examLibrary'

const route = useRoute()
const router = useRouter()

const year = computed(() => Number(route.params.year))
const exam = computed(() => getExamById(route.params.examId))
const pdfAssets = computed(() => getPdfAssets(exam.value, year.value))

const currentPreview = ref('question')

watch(
  () => [route.params.examId, route.params.year],
  () => {
    currentPreview.value = 'question'
  }
)

const assetLabel = computed(() => {
  if (!pdfAssets.value.available) return '资料待补充'
  return pdfAssets.value.mode === 'combined' ? '题目与答案合并版 PDF' : '题目与答案分离版 PDF'
})

const currentPreviewSrc = computed(() => {
  if (!pdfAssets.value.available) return ''
  return currentPreview.value === 'answer' ? pdfAssets.value.answer : pdfAssets.value.question
})

const currentPreviewTitle = computed(() => {
  if (currentPreview.value === 'answer') return `${year.value} 年答案解析`
  return `${year.value} 年题目原卷`
})

const goToYear = (targetYear) => {
  router.push({ name: 'paper-detail', params: { examId: exam.value.id, year: targetYear } })
}
</script>

<style scoped>
.detail-page {
  padding-top: 3rem;
}

.detail-hero,
.toolbar {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: center;
}

.detail-copy {
  margin-top: 0.75rem;
  color: #5b6574;
}

.hero-actions,
.preview-switch,
.download-group {
  display: flex;
  gap: 0.8rem;
  flex-wrap: wrap;
}

.toolbar {
  margin-top: 1.25rem;
}

.year-picker {
  flex: 1;
}

.year-picker span {
  display: block;
  margin-bottom: 0.8rem;
  color: #69758a;
  font-weight: 700;
}

.year-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
}

.year-btn,
.switch-btn {
  border: 1px solid #d7e3f1;
  background: #fff;
  color: #0d5cab;
  border-radius: 999px;
  padding: 0.6rem 0.95rem;
  cursor: pointer;
  font-weight: 700;
}

.year-btn.active,
.switch-btn.active {
  background: #0d5cab;
  color: #fff;
  border-color: #0d5cab;
}

.switch-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.detail-grid {
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr);
  gap: 1.25rem;
  margin-top: 1.25rem;
}

.info-list {
  margin: 1rem 0 1.5rem;
  padding-left: 1.1rem;
  color: #5b6574;
}

.info-list li + li {
  margin-top: 0.5rem;
}

.empty-copy {
  color: #8b96a8;
}

.preview-head {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: center;
  margin-bottom: 1rem;
}

.pdf-frame-wrap {
  border: 1px solid #e3e9f2;
  border-radius: 20px;
  overflow: hidden;
  background: #f8fbff;
}

.pdf-frame {
  width: 100%;
  min-height: 960px;
  border: none;
  background: #fff;
}

.preview-empty {
  min-height: 360px;
  display: grid;
  place-items: center;
  text-align: center;
  color: #6c7687;
}

@media (max-width: 960px) {
  .detail-hero,
  .toolbar,
  .detail-grid,
  .preview-head {
    grid-template-columns: 1fr;
    display: grid;
  }
}
</style>
