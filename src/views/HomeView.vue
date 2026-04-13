<template>
  <div class="home-view">
    <section class="hero">
      <div class="container hero-grid">
        <div class="hero-copy">
          <span class="hero-badge">2026 备考进行时</span>
          <h1>把 CPA 历年真题做成更顺手的在线训练场</h1>
          <p>
            按科目、年份快速进入真题；在线模拟答题、标记难题、查看 PDF 原卷，
            让刷题和复盘都更流畅。
          </p>
          <div class="hero-actions">
            <router-link to="/practice" class="btn btn-primary">进入真题库</router-link>
            <router-link to="/profile" class="btn btn-ghost">查看学习中心</router-link>
          </div>
        </div>

        <div class="hero-panel">
          <div class="metric-card">
            <strong>13 年真题</strong>
            <p>覆盖 2013 - 2025 全科 PDF 资料</p>
          </div>
          <div class="metric-row">
            <div class="metric-block">
              <span>6</span>
              <p>专业阶段科目</p>
            </div>
            <div class="metric-block">
              <span>40+</span>
              <p>模拟题位</p>
            </div>
            <div class="metric-block">
              <span>3</span>
              <p>练习路径</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="container">
      <h2 class="section-title">我们先把最重要的几件事做好</h2>
      <div class="feature-grid">
        <article class="card feature-card">
          <h3>真题直达</h3>
          <p>每个科目按年份展开，可直接进入模拟，也可以打开 PDF 原卷或答案解析。</p>
        </article>
        <article class="card feature-card">
          <h3>做题过程清晰</h3>
          <p>倒计时、题号导航、已做/待做/标记状态一眼可见，适合整套卷练习。</p>
        </article>
        <article class="card feature-card">
          <h3>学习中心沉淀</h3>
          <p>记录近期成绩、阶段进度和下一步建议，后续继续接错题与复盘功能。</p>
        </article>
      </div>
    </section>

    <section class="container exam-mode">
      <div class="card">
        <h2 class="section-title left">CPA 考试结构</h2>
        <div class="mode-grid">
          <div>
            <h3>专业阶段 6 科</h3>
            <p>会计、审计、财务成本管理、税法、经济法、公司战略与风险管理。</p>
          </div>
          <div>
            <h3>训练建议</h3>
            <p>先按单科刷近 3 年，再做整套时间模拟，最后回看原卷和答案 PDF 复盘。</p>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.home-view {
  padding-bottom: 1rem;
}

.hero {
  position: relative;
  overflow: hidden;
}

.hero::after {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at top right, rgba(255, 179, 71, 0.28), transparent 30%),
    radial-gradient(circle at bottom left, rgba(255, 123, 84, 0.22), transparent 35%);
  pointer-events: none;
}

.hero-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(300px, 0.8fr);
  gap: 2rem;
  align-items: center;
}

.hero-copy,
.hero-panel {
  position: relative;
  z-index: 1;
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.4rem 0.9rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.14);
  margin-bottom: 1rem;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.hero-copy h1 {
  max-width: 10em;
}

.hero-actions {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.btn-ghost {
  color: #0a2a4a;
  border: 1px solid rgba(10, 42, 74, 0.55);
  background: rgba(255, 255, 255, 0.78);
  font-weight: 700;
}

.btn-ghost:hover {
  background: #fff;
  border-color: rgba(10, 42, 74, 0.82);
  color: #06203a;
}

.hero-panel {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 28px;
  padding: 1.5rem;
  box-shadow: 0 18px 50px rgba(6, 21, 39, 0.16);
}

.metric-card {
  padding: 1.4rem;
  border-radius: 22px;
  background: rgba(10, 32, 58, 0.34);
  margin-bottom: 1rem;
}

.metric-card strong {
  display: block;
  font-size: 1.4rem;
  margin-bottom: 0.45rem;
}

.metric-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

.metric-block {
  background: rgba(255, 255, 255, 0.08);
  border-radius: 18px;
  padding: 1rem;
  text-align: center;
}

.metric-block span {
  display: block;
  font-size: 1.8rem;
  font-weight: 800;
}

.feature-grid,
.mode-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1.25rem;
}

.feature-card p,
.mode-grid p {
  color: #5b6574;
}

.left {
  text-align: left;
  margin-bottom: 2rem;
}

@media (max-width: 900px) {
  .hero-grid,
  .feature-grid,
  .mode-grid {
    grid-template-columns: 1fr;
  }
}
</style>
