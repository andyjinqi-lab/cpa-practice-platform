<template>
  <section class="container support-wrap">
    <article class="support-bar card">
      <div class="support-copy">
        <strong>支持维护</strong>
        <p>如果这个平台对你有帮助，欢迎请我喝杯咖啡。</p>
      </div>
      <button class="support-btn" @click="openModal">
        <span class="dot" />
        请我喝杯咖啡
      </button>
    </article>

    <div v-if="showModal" class="support-modal-mask" @click.self="closeModal">
      <article class="support-modal card">
        <button class="close-btn" aria-label="关闭" @click="closeModal">×</button>
        <h3>支持我们</h3>
        <p class="modal-copy">
          这个网站由一位考友利用业余时间开发维护，
          如果对你有帮助，欢迎请我喝杯咖啡 :)
        </p>

        <div class="tab-row">
          <button :class="['tab-btn', { active: activeTab === 'alipay' }]" @click="activeTab = 'alipay'">支付宝</button>
          <button :class="['tab-btn', { active: activeTab === 'wechat' }]" @click="activeTab = 'wechat'">微信</button>
        </div>

        <div :class="['pay-panel', activeTab]">
          <p class="pay-title">{{ activeTab === 'alipay' ? '推荐使用支付宝' : '推荐使用微信支付' }}</p>
          <img
            :src="activeTab === 'alipay' ? alipayQrSrc : wechatQrSrc"
            :alt="activeTab === 'alipay' ? '支付宝收款码' : '微信收款码'"
            class="pay-qr"
          >
        </div>

        <p class="thanks-copy">
          感谢你的支持与鼓励<br>
          每一份心意都是持续更新的动力
        </p>
      </article>
    </div>
  </section>
</template>

<script setup>
import { ref } from 'vue'

const showModal = ref(false)
const activeTab = ref('alipay')

const alipayQrSrc = '/donate/alipay-qr.png'
const wechatQrSrc = '/donate/wechat-qr.png'

function openModal() {
  showModal.value = true
}

function closeModal() {
  showModal.value = false
}
</script>

<style scoped>
.support-wrap {
  padding-top: 1.5rem;
}

.support-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  border-radius: 24px;
  border: 1px solid rgba(219, 196, 173, 0.8);
}

.support-copy strong {
  display: block;
  color: #c56b2f;
  font-size: 1.2rem;
  margin-bottom: 0.25rem;
}

.support-copy p {
  color: #56657a;
}

.support-btn {
  border: 1px solid #ead9cb;
  border-radius: 999px;
  background: #fff7f0;
  color: #3c2b1d;
  font-weight: 700;
  padding: 0.72rem 1.1rem;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  min-width: 180px;
  justify-content: center;
}

.support-btn:hover {
  background: #fff0e5;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: radial-gradient(circle at 30% 30%, #90603f 15%, #684324 70%);
}

.support-modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(6, 17, 30, 0.45);
  z-index: 100;
  display: grid;
  place-items: center;
  padding: 1rem;
}

.support-modal {
  width: min(560px, 100%);
  border-radius: 22px;
  position: relative;
  animation: pop-in 0.2s ease;
}

.close-btn {
  position: absolute;
  right: 0.95rem;
  top: 0.8rem;
  border: none;
  background: transparent;
  color: #7a7067;
  font-size: 1.8rem;
  line-height: 1;
  cursor: pointer;
}

.support-modal h3 {
  text-align: center;
  font-size: 2rem;
  margin: 0.2rem 0 0.7rem;
  color: #332a22;
}

.modal-copy {
  text-align: center;
  color: #7a7067;
  margin-bottom: 1rem;
}

.tab-row {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  border-bottom: 1px solid #e8ddd2;
  margin-bottom: 1rem;
}

.tab-btn {
  border: none;
  background: transparent;
  cursor: pointer;
  font-weight: 700;
  color: #8a8179;
  padding: 0.75rem 0.5rem;
}

.tab-btn.active {
  color: #2a7df4;
  box-shadow: inset 0 -2px 0 #2a7df4;
}

.pay-panel {
  border-radius: 16px;
  padding: 1rem;
  text-align: center;
}

.pay-panel.alipay {
  background: linear-gradient(180deg, #157efb, #2d8cff);
}

.pay-panel.wechat {
  background: linear-gradient(180deg, #0cbc61, #14c46d);
}

.pay-title {
  color: #fff;
  font-size: 1.75rem;
  font-weight: 800;
  margin-bottom: 0.8rem;
}

.pay-qr {
  width: min(280px, 85%);
  border-radius: 12px;
  background: #fff;
  padding: 0.5rem;
}

.thanks-copy {
  margin-top: 1rem;
  text-align: center;
  color: #8b8077;
}

@keyframes pop-in {
  from {
    opacity: 0;
    transform: translateY(8px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@media (max-width: 780px) {
  .support-bar {
    flex-direction: column;
    align-items: flex-start;
  }

  .support-btn {
    width: 100%;
  }

  .support-modal h3 {
    font-size: 1.7rem;
  }

  .pay-title {
    font-size: 1.45rem;
  }
}
</style>
