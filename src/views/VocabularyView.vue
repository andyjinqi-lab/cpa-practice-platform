<template>
  <section class="container">
    <h2 class="section-title">单词背诵</h2>
    <div class="card">
      <h3>每日20词</h3>
      <p>按等级和掌握情况推荐今天最值得复习的词，每天10分钟就能坚持。</p>
      <button class="btn btn-primary">开始今日背词</button>
    </div>
    <div class="card">
      <h3>主题词表</h3>
      <div class="theme-list">
        <div v-for="theme in themes" :key="theme.id" class="theme-item">
          <h4>{{ theme.name }}</h4>
          <p>{{ theme.description }}</p>
          <button class="btn btn-primary">开始学习</button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref } from 'vue'

const themes = ref([
  {
    id: 1,
    name: '会计基础词汇',
    description: '包含会计科目常用专业术语'
  },
  {
    id: 2,
    name: '审计专业词汇',
    description: '包含审计科目常用专业术语'
  },
  {
    id: 3,
    name: '税法专业词汇',
    description: '包含税法科目常用专业术语'
  }
])
</script>

<style scoped>
.theme-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1rem;
}

.theme-item {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 1.5rem;
  transition: transform 0.2s;
}

.theme-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.theme-item h4 {
  margin-bottom: 0.5rem;
  color: #1e88e5;
}

.theme-item p {
  margin-bottom: 1rem;
  color: #666;
}
</style>