<template>
  <section class="container auth-page">
    <div class="auth-card card">
      <p class="eyebrow">创建账号</p>
      <h2>注册后开始你的 CPA 真题训练</h2>
      <p class="auth-desc">完成邮箱注册后即可登录；后续可通过邮箱重置密码。</p>

      <form @submit.prevent="handleRegister">
        <div class="form-group">
          <label for="email">邮箱</label>
          <input id="email" v-model.trim="form.email" type="email" placeholder="请输入邮箱" required>
        </div>
        <div class="form-group">
          <label for="password">密码</label>
          <input id="password" v-model="form.password" type="password" placeholder="请输入密码" required>
        </div>
        <div class="form-group">
          <label for="confirmPassword">确认密码</label>
          <input id="confirmPassword" v-model="form.confirmPassword" type="password" placeholder="请再次输入密码" required>
        </div>
        <button type="submit" class="btn auth-submit" :disabled="submitting">
          {{ submitting ? '注册中...' : '注册' }}
        </button>
      </form>

      <p v-if="error" class="feedback error">{{ error }}</p>
      <p v-if="message" class="feedback success">{{ message }}</p>

      <p class="switch-link">
        已有账号？
        <router-link to="/login">直接登录</router-link>
      </p>
    </div>
  </section>
</template>

<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { registerWithEmail } from '../services/auth'

const router = useRouter()
const route = useRoute()
const form = ref({
  email: '',
  password: '',
  confirmPassword: ''
})
const submitting = ref(false)
const error = ref('')
const message = ref('')

const handleRegister = async () => {
  error.value = ''
  message.value = ''

  if (form.value.password.length < 8) {
    error.value = '密码至少 8 位'
    return
  }
  if (form.value.password !== form.value.confirmPassword) {
    error.value = '两次输入的密码不一致'
    return
  }

  submitting.value = true
  try {
    const result = await registerWithEmail({
      email: form.value.email,
      password: form.value.password
    })
    if (!result.ok) {
      error.value = result.message
      return
    }
    message.value = '注册成功，正在跳转登录页...'
    setTimeout(() => {
      const redirect = typeof route.query.redirect === 'string' && route.query.redirect.startsWith('/')
        ? route.query.redirect
        : ''
      router.push({
        path: '/login',
        query: redirect ? { redirect } : undefined
      })
    }, 700)
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
  margin-top: 1rem;
  text-align: center;
}

.feedback {
  margin-top: 0.9rem;
  padding: 0.65rem 0.75rem;
  border-radius: 12px;
}

.feedback.error {
  background: #fff1ee;
  color: #c75d38;
}

.feedback.success {
  background: #eef8f1;
  color: #2b7b4d;
}
</style>
