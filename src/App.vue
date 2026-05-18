<template>
  <div class="app-shell">
    <header class="site-header">
      <nav class="container nav-bar">
        <router-link to="/" class="brand">
          <span class="brand-mark">CPA</span>
          <div>
            <strong>CPA 真题练习平台</strong>
            <p>历年真题 · 模拟训练 · 做题复盘</p>
          </div>
        </router-link>

        <div class="nav-links">
          <router-link to="/">首页</router-link>
          <router-link to="/practice">真题练习</router-link>
          <router-link to="/profile">学习中心</router-link>
          <template v-if="!PUBLIC_FILING_REVIEW_MODE">
            <router-link v-if="!isLoggedIn" to="/login" class="nav-action">登录</router-link>
            <router-link v-if="!isLoggedIn" to="/register">注册</router-link>
            <template v-else>
              <span class="nav-email">{{ session?.email }}</span>
              <button class="nav-logout" @click="handleLogout">退出</button>
            </template>
          </template>
        </div>
      </nav>
    </header>

    <main class="site-main">
      <router-view />
    </main>

    <footer class="site-footer">
      <div class="container footer-inner">
        <div>
          <strong>CPA 真题练习平台</strong>
          <p>聚合历年真题 PDF、在线模拟与学习进度追踪。</p>
        </div>
        <div class="footer-records" aria-label="网站备案信息">
          <p>&copy; 2026 CPA Practice</p>
          <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer">
            沪ICP备2026017304号-1
          </a>
          <a
            class="police-record"
            href="https://beian.mps.gov.cn/#/query/webSearch?code=31010402336708"
            rel="noreferrer"
            target="_blank"
          >
            <img src="/beian-police.png" alt="" aria-hidden="true">
            <span>沪公网安备31010402336708号</span>
          </a>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { PUBLIC_FILING_REVIEW_MODE } from './config/reviewMode'
import { getSession, logout } from './services/auth'

const router = useRouter()
const session = ref(getSession())
const isLoggedIn = computed(() => Boolean(session.value?.email))

function refreshSession() {
  session.value = getSession()
}

async function handleLogout() {
  await logout()
  refreshSession()
  router.push('/login')
}

onMounted(() => {
  if (PUBLIC_FILING_REVIEW_MODE) return
  window.addEventListener('storage', refreshSession)
  window.addEventListener('focus', refreshSession)
})

onUnmounted(() => {
  if (PUBLIC_FILING_REVIEW_MODE) return
  window.removeEventListener('storage', refreshSession)
  window.removeEventListener('focus', refreshSession)
})
</script>

<style scoped>
.app-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.site-header {
  position: sticky;
  top: 0;
  z-index: 10;
  backdrop-filter: blur(18px);
  background: rgba(10, 30, 58, 0.92);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.nav-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1.5rem;
  padding-top: 1rem;
  padding-bottom: 1rem;
}

.brand {
  display: flex;
  align-items: center;
  gap: 1rem;
  color: #fff;
  text-decoration: none;
}

.brand strong {
  display: block;
  font-size: 1rem;
}

.brand p {
  margin: 0.25rem 0 0;
  font-size: 0.85rem;
  opacity: 0.72;
}

.brand-mark {
  width: 48px;
  height: 48px;
  border-radius: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #ffb347, #ff7b54);
  color: #08203a;
  font-weight: 800;
  letter-spacing: 0.06em;
}

.nav-links {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  flex-wrap: wrap;
}

.nav-links a {
  color: rgba(255, 255, 255, 0.88);
  text-decoration: none;
  padding: 0.7rem 1rem;
  border-radius: 999px;
  transition: background-color 0.2s ease, color 0.2s ease, transform 0.2s ease;
}

.nav-links a.router-link-exact-active {
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
}

.nav-links a:hover {
  background: rgba(255, 255, 255, 0.08);
  transform: translateY(-1px);
}

.nav-action {
  background: linear-gradient(135deg, #ffb347, #ff7b54);
  color: #08203a !important;
  font-weight: 700;
}

.nav-email {
  color: rgba(255, 255, 255, 0.78);
  font-size: 0.9rem;
}

.nav-logout {
  border: 1px solid rgba(255, 255, 255, 0.32);
  background: transparent;
  color: rgba(255, 255, 255, 0.92);
  border-radius: 999px;
  padding: 0.58rem 0.95rem;
  cursor: pointer;
}

.nav-logout:hover {
  background: rgba(255, 255, 255, 0.1);
}

.site-main {
  flex: 1;
}

.site-footer {
  background: #08203a;
  color: rgba(255, 255, 255, 0.8);
  margin-top: 4rem;
}

.footer-inner {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: center;
  padding-top: 1.4rem;
  padding-bottom: 1.4rem;
}

.site-footer p {
  margin: 0.25rem 0 0;
}

.footer-records {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.25rem;
  font-size: 0.92rem;
}

.footer-records a,
.footer-records span {
  color: rgba(255, 255, 255, 0.76);
  text-decoration: none;
}

.footer-records a:hover {
  color: #fff;
  text-decoration: underline;
}

.police-record {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.police-record img {
  width: 18px;
  height: 18px;
  flex: 0 0 auto;
}

@media (max-width: 768px) {
  .site-header {
    position: static;
  }

  .nav-bar,
  .footer-inner {
    flex-direction: column;
    align-items: flex-start;
  }

  .nav-links {
    width: 100%;
  }

  .footer-records {
    align-items: flex-start;
  }
}
</style>
