<template>
  <section class="container auth-page">
    <div class="auth-card card">
      <p class="eyebrow">重置密码</p>
      <h2>设置新的登录密码</h2>

      <p v-if="tokenError" class="feedback error">{{ tokenError }}</p>

      <form v-else @submit.prevent="handleReset">
        <div class="form-group">
          <label for="password">新密码</label>
          <input id="password" v-model="form.password" type="password" placeholder="至少 8 位" required>
        </div>
        <div class="form-group">
          <label for="confirmPassword">确认新密码</label>
          <input id="confirmPassword" v-model="form.confirmPassword" type="password" placeholder="再次输入新密码" required>
        </div>
        <button type="submit" class="btn auth-submit" :disabled="submitting">
          {{ submitting ? '提交中...' : '确认重置' }}
        </button>
      </form>

      <p v-if="message" class="feedback success">{{ message }}</p>
      <p v-if="error" class="feedback error">{{ error }}</p>

      <p class="switch-link">
        <router-link to="/login">返回登录</router-link>
      </p>
    </div>
  </section>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { resetPasswordWithToken, verifyResetToken } from '../services/auth'

const route = useRoute()
const router = useRouter()

const token = ref('')
const tokenError = ref('')
const submitting = ref(false)
const message = ref('')
const error = ref('')
const form = ref({
  password: '',
  confirmPassword: ''
})

onMounted(() => {
  token.value = String(route.query.token || '')
  if (!token.value) {
    tokenError.value = '缺少重置令牌，请重新申请重置密码。'
    return
  }
  const check = verifyResetToken(token.value)
  if (!check.ok) {
    tokenError.value = check.message
  }
})

const handleReset = async () => {
  if (form.value.password.length < 8) {
    error.value = '新密码至少 8 位'
    return
  }
  if (form.value.password !== form.value.confirmPassword) {
    error.value = '两次输入的密码不一致'
    return
  }

  submitting.value = true
  error.value = ''
  message.value = ''

  try {
    const result = await resetPasswordWithToken({
      token: token.value,
      newPassword: form.value.password
    })
    if (!result.ok) {
      error.value = result.message
      return
    }
    message.value = result.message
    setTimeout(() => {
      router.push('/login')
    }, 900)
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

.switch-link {
  margin-top: 1rem;
  text-align: center;
}
</style>

