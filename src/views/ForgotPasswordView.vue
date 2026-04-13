<template>
  <section class="container auth-page">
    <div class="auth-card card">
      <p class="eyebrow">找回密码</p>
      <h2>通过邮箱重置密码</h2>
      <p class="auth-desc">输入注册邮箱，我们会发送重置链接（当前为演示环境）。</p>

      <form @submit.prevent="handleSubmit">
        <div class="form-group">
          <label for="email">邮箱</label>
          <input id="email" v-model.trim="email" type="email" placeholder="请输入注册邮箱" required>
        </div>
        <button type="submit" class="btn auth-submit" :disabled="submitting">
          {{ submitting ? '发送中...' : '发送重置邮件' }}
        </button>
      </form>

      <p v-if="message" class="feedback success">{{ message }}</p>
      <p v-if="error" class="feedback error">{{ error }}</p>

      <div v-if="debugResetLink" class="debug-box">
        <p>演示环境重置链接：</p>
        <a :href="debugResetLink">{{ debugResetLink }}</a>
      </div>

      <p class="switch-link">
        想起密码了？
        <router-link to="/login">返回登录</router-link>
      </p>
    </div>
  </section>
</template>

<script setup>
import { ref } from 'vue'
import { requestPasswordReset } from '../services/auth'

const email = ref('')
const submitting = ref(false)
const message = ref('')
const error = ref('')
const debugResetLink = ref('')

const handleSubmit = async () => {
  submitting.value = true
  message.value = ''
  error.value = ''
  debugResetLink.value = ''

  try {
    const result = await requestPasswordReset(email.value)
    message.value = result.message
    if (result.debugResetLink) {
      debugResetLink.value = result.debugResetLink
    }
  } catch (e) {
    error.value = '发送失败，请稍后重试。'
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

.feedback {
  margin-top: 0.9rem;
  padding: 0.65rem 0.75rem;
  border-radius: 12px;
}

.feedback.success {
  background: #eef8f1;
  color: #2b7b4d;
}

.feedback.error {
  background: #fff1ee;
  color: #c75d38;
}

.debug-box {
  margin-top: 0.9rem;
  padding: 0.75rem;
  border-radius: 12px;
  background: #f4f8ff;
  border: 1px solid #dbe7f5;
}

.debug-box a {
  word-break: break-all;
}

.switch-link {
  margin-top: 1rem;
  text-align: center;
}
</style>
