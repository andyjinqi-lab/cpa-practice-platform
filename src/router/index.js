import { createRouter, createWebHistory } from 'vue-router'
import { h } from 'vue'
import { isAuthenticated } from '../services/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('../views/HomeView.vue')
    },
    {
      path: '/practice',
      name: 'practice',
      component: () => import('../views/PracticeLibraryView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/paper/:examId/:year',
      name: 'paper-detail',
      component: () => import('../views/PaperPreviewView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/exam/:examId/:year',
      name: 'exam',
      component: () => import('../views/ExamView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue'),
      meta: { guestOnly: true }
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('../views/RegisterView.vue'),
      meta: { guestOnly: true }
    },
    {
      path: '/forgot-password',
      name: 'forgot-password',
      component: () => import('../views/ForgotPasswordView.vue'),
      meta: { guestOnly: true }
    },
    {
      path: '/reset-password',
      name: 'reset-password',
      component: () => import('../views/ResetPasswordView.vue'),
      meta: { guestOnly: true }
    },
    {
      path: '/profile',
      name: 'profile',
      component: () => import('../views/ProfileCenterView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: {
        render: () => h('div', { style: 'padding: 96px 24px; text-align: center; color: #345;' }, '页面未找到')
      }
    }
  ]
})

router.beforeEach((to) => {
  const loggedIn = isAuthenticated()

  if (to.meta.requiresAuth && !loggedIn) {
    return {
      name: 'login',
      query: {
        redirect: to.fullPath
      }
    }
  }

  if (to.meta.guestOnly && loggedIn) {
    const redirect = typeof to.query.redirect === 'string' && to.query.redirect.startsWith('/')
      ? to.query.redirect
      : '/'
    return redirect
  }

  return true
})

export default router
