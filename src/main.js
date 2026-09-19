import { createApp } from 'vue';
import App from './App.vue';
import AppIcon from './components/AppIcon.vue';
import './styles.css';
import { registerSW } from 'virtual:pwa-register';

const app = createApp(App);
app.component('icon', AppIcon);

app.config.errorHandler = (err, instance, info) => {
  console.error('Vue Error:', err, info);
};

app.mount('#app');

if ('serviceWorker' in navigator) {
  registerSW({
    immediate: true,
    onNeedRefresh() { window.dispatchEvent(new CustomEvent('pwa:update')); },
    onOfflineReady() { console.log('✅ PWA lista para uso offline'); },
    onRegisteredSW(url, reg) {
      console.log('✅ Service Worker registrado:', url);
      if (reg) setInterval(() => reg.update().catch(() => {}), 60 * 60 * 1000);
    },
    onRegisterError(err) { console.error('❌ SW falló:', err); }
  });
}
