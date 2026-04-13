<template>
  <section class="container auth-page">
    <div class="auth-card card">
      <p class="eyebrow">欢迎回来</p>
      <h2>登录账号继续刷题</h2>
      <p class="auth-desc">使用邮箱登录；若忘记密码，可通过邮箱重置。</p>

      <form @submit.prevent="handleLogin">
        <div class="form-group">
          <label for="email">邮箱</label>
          <input id="email" v-model.trim="form.email" type="email" placeholder="请输入注册邮箱" required>
        </div>
        <div class="form-group">
          <label for="password">密码</label>
          <input id="password" v-model="form.password" type="password" placeholder="请输入密码" required>
        </div>
        <button type="submit" class="btn auth-submit" :disabled="submitting">
          {{ submitting ? '登录中...' : '登录' }}
        </button>
      </form>

      <p v-if="error" class="feedback error">{{ error }}</p>

      <p class="switch-link">
        <router-link to="/forgot-password">忘记密码？</router-link>
      </p>
      <p class="switch-link">
        还没有账号？
        <router-link to="/register">立即注册</router-link>
      </p>
    </div>
  </section>
</template>

<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { loginWithEmail } from '../services/auth'

const router = useRouter()
const route = useRoute()
const form = ref({
  email: '',
  password: ''
})
const submitting = ref(false)
const error = ref('')

const handleLogin = async () => {
  submitting.value = true
  error.value = ''
  try {
    const result = await loginWithEmail(form.value)
    if (!result.ok) {
      error.value = result.message
      return
    }
    const redirect = typeof route.query.redirect === 'string' && route.query.redirect.startsWith('/')
      ? route.query.redirect
      : '/'
    router.push(redirect)
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.auth-page {
  padding-top: 4rem;
}

.auth-card {
  max-width: 460px;
  margin: 0 auto;
}

.eyebrow {
  color: #d96c2f;
  font-weight: 800;
  margin-bottom: 0.6rem;
}

.auth-desc,
.switch-link {
  color: #69758a;
}

.auth-submit {
  width: 100%;
  background: linear-gradient(135deg, #0d5cab, #4c94df);
  color: #fff;
}

.switch-link {
  margin-top: 0.75rem;
  text-align: center;
}

.feedback.error {
  margin-top: 0.9rem;
  padding: 0.65rem 0.75rem;
  border-radius: 12px;
  background: #fff1ee;
  color: #c75d38;
}
</style>
