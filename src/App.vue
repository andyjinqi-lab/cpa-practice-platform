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
          <router-link v-if="!isLoggedIn" to="/login" class="nav-action">登录</router-link>
          <router-link v-if="!isLoggedIn" to="/register">注册</router-link>
          <template v-else>
            <span class="nav-email">{{ session?.email }}</span>
            <button class="nav-logout" @click="handleLogout">退出</button>
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
        <p>&copy; 2026 CPA Practice</p>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getSession, logout } from './services/auth'

const router = useRouter()
const session = ref(getSession())
const isLoggedIn = computed(() => Boolean(session.value?.email))

function refreshSession() {
  session.value = getSession()
}

function handleLogout() {
  logout()
  refreshSession()
  router.push('/login')
}

onMounted(() => {
  window.addEventListener('storage', refreshSession)
  window.addEventListener('focus', refreshSession)
})

onUnmounted(() => {
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
}
</style>
