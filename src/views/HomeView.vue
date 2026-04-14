<template>
  <div class="home-view">
    <section class="hero">
      <div class="container hero-grid">
        <div class="hero-copy">
          <p class="hero-kicker">2026 备考进行时</p>
          <h1>CPA真题实战模拟</h1>
          <p class="hero-summary">
            首页先看提醒，再进题库实战：按科目/年份刷题、模拟答题、查看 PDF 原卷，最后回学习中心复盘。
          </p>
          <div class="hero-actions">
            <router-link to="/practice" class="btn btn-primary">进入真题练习</router-link>
            <router-link to="/profile" class="btn hero-ghost">查看学习中心</router-link>
          </div>
        </div>

        <aside class="hero-panel">
          <h2>备考概览</h2>
          <div class="stats-grid">
            <article class="stat-card">
              <strong>13 年</strong>
              <p>历年真题覆盖</p>
            </article>
            <article class="stat-card">
              <strong>6 科</strong>
              <p>专业阶段科目</p>
            </article>
            <article class="stat-card">
              <strong>40+</strong>
              <p>模拟题位</p>
            </article>
            <article class="stat-card">
              <strong>3 步</strong>
              <p>练习闭环</p>
            </article>
          </div>
        </aside>
      </div>
    </section>

    <section class="container notice-section">
      <div class="notice-header">
        <h2 class="section-title left">官方报名与考试提醒</h2>
        <a
          class="official-link"
          href="https://cpaexam.cicpa.org.cn/default.shtml"
          target="_blank"
          rel="noopener noreferrer"
        >
          打开中注协考试官网
        </a>
      </div>
      <div class="notice-grid">
        <article class="card notice-card important">
          <span class="tag">重点</span>
          <h3>2026 报名窗口（以官网最新公告为准）</h3>
          <p>参考当前公告：4 月 7 日 08:00 - 4 月 30 日 20:00。建议提前准备报名信息，避免最后两天拥堵。</p>
        </article>
        <article class="card notice-card">
          <span class="tag">必做</span>
          <h3>缴费后再核对报名状态</h3>
          <p>完成报名与缴费后，务必回官网确认状态和报考科目，避免“已提交但未完成支付”导致报名无效。</p>
        </article>
        <article class="card notice-card">
          <span class="tag">提醒</span>
          <h3>准考证与考场信息单独关注</h3>
          <p>准考证下载时间、考试时间、考场安排会分阶段公布，建议每周固定查看 1 次官网公告。</p>
        </article>
      </div>
    </section>

    <section class="container">
      <h2 class="section-title left">推荐学习节奏</h2>
      <div class="journey-grid">
        <article class="card journey-card">
          <p class="step-index">STEP 1</p>
          <h3>近三年真题先打通</h3>
          <p>先做近三年真题，把题型和常见考点走一遍，建立手感。</p>
        </article>
        <article class="card journey-card">
          <p class="step-index">STEP 2</p>
          <h3>按考试时长做整套模拟</h3>
          <p>严格计时训练，重点暴露节奏问题与薄弱章节。</p>
        </article>
        <article class="card journey-card">
          <p class="step-index">STEP 3</p>
          <h3>学习中心做错题复盘</h3>
          <p>把错题原因分为“知识漏洞 / 审题失误 / 时间不足”，每周闭环复盘。</p>
        </article>
      </div>
    </section>

    <section class="container action-section">
      <div class="card action-card">
        <h2>现在开始今天的学习任务</h2>
        <p>建议每天至少完成一个“25 分钟练习块”：20 分钟做题 + 5 分钟复盘。</p>
        <div class="hero-actions">
          <router-link to="/practice" class="btn btn-primary">去做一套题</router-link>
          <router-link to="/profile" class="btn hero-ghost">查看我的进度</router-link>
        </div>
      </div>
    </section>

    <SupportDonate />
  </div>
</template>

<script setup>
import SupportDonate from '../components/SupportDonate.vue'
</script>

<style scoped>
.home-view {
  padding-bottom: 1rem;
}

.hero {
  position: relative;
  overflow: hidden;
  padding: 0.5rem 0 2rem;
}

.hero::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 15% 18%, rgba(255, 173, 70, 0.2), transparent 35%),
    radial-gradient(circle at 86% 30%, rgba(14, 61, 111, 0.12), transparent 30%),
    linear-gradient(120deg, rgba(255, 255, 255, 0.85), rgba(245, 248, 252, 0.92));
  pointer-events: none;
}

.hero-grid {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(320px, 0.85fr);
  gap: 1.25rem;
  align-items: stretch;
}

.hero-copy {
  padding: 1.75rem 0 1rem;
}

.hero-kicker {
  display: inline-flex;
  align-items: center;
  padding: 0.35rem 0.8rem;
  margin-bottom: 1rem;
  border-radius: 999px;
  font-size: 0.9rem;
  font-weight: 700;
  color: #11406f;
  background: rgba(17, 64, 111, 0.1);
}

.hero-copy h1 {
  max-width: 12.2em;
  margin-bottom: 1rem;
  font-size: clamp(1.95rem, 4vw, 3rem);
  line-height: 1.2;
}

.hero-summary {
  max-width: 40rem;
  margin-bottom: 1.25rem;
  color: #394659;
  font-size: 1.04rem;
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.9rem;
}

.hero-ghost {
  border: 1px solid #7d8ca3;
  background: #fff;
  color: #113c67;
  font-weight: 700;
}

.hero-ghost:hover {
  border-color: #1b4c7a;
  color: #0f3559;
}

.hero-panel {
  border-radius: 24px;
  padding: 1.2rem;
  border: 1px solid rgba(17, 64, 111, 0.18);
  background: rgba(255, 255, 255, 0.82);
  color: #123d67;
  box-shadow: 0 12px 28px rgba(8, 28, 50, 0.12);
}

.hero-panel h2 {
  margin: 0 0 0.85rem;
  font-size: 1.15rem;
  color: #123d67;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.8rem;
}

.stat-card {
  border-radius: 16px;
  padding: 0.95rem;
  background: rgba(17, 64, 111, 0.1);
}

.stat-card strong {
  display: block;
  margin-bottom: 0.2rem;
  font-size: 1.55rem;
  color: #123d67;
}

.stat-card p {
  margin: 0;
  color: #2f4f70;
}

.notice-section {
  margin-top: 0.5rem;
}

.notice-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.8rem;
  margin-bottom: 1rem;
}

.official-link {
  white-space: nowrap;
  color: #1c5f98;
  font-weight: 700;
}

.notice-grid,
.journey-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;
}

.notice-card,
.journey-card,
.action-card {
  border-radius: 18px;
}

.notice-card h3,
.journey-card h3 {
  margin-bottom: 0.65rem;
}

.notice-card p,
.journey-card p {
  color: #5a6678;
}

.notice-card .tag {
  display: inline-flex;
  margin-bottom: 0.65rem;
  padding: 0.2rem 0.65rem;
  border-radius: 999px;
  background: #edf3ff;
  color: #1c4d86;
  font-size: 0.82rem;
  font-weight: 700;
}

.notice-card.important {
  background: linear-gradient(140deg, #fff9ef, #fff);
  border: 1px solid #ffd9a4;
}

.step-index {
  margin: 0 0 0.55rem;
  font-size: 0.8rem;
  letter-spacing: 0.06em;
  color: #1f5a8f;
  font-weight: 700;
}

.action-section {
  margin: 1rem auto 1.4rem;
}

.action-card {
  background: linear-gradient(100deg, #f2f7ff, #fffdf9);
}

.action-card h2 {
  margin-bottom: 0.65rem;
}

.action-card p {
  margin-bottom: 1rem;
  color: #4f5d72;
}

.left {
  text-align: left;
  margin-bottom: 0;
}

@media (max-width: 960px) {
  .hero-grid,
  .notice-grid,
  .journey-grid {
    grid-template-columns: 1fr;
  }

  .hero-copy {
    padding-top: 1rem;
  }

  .hero-copy h1 {
    max-width: none;
  }

  .notice-header {
    align-items: flex-start;
    flex-direction: column;
  }
}

@media (max-width: 560px) {
  .stats-grid {
    grid-template-columns: 1fr 1fr;
  }

  .hero-summary {
    font-size: 0.96rem;
  }
}
</style>
