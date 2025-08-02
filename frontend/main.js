import * as Vue from 'vue';
import router from './router/index';
import { createPinia } from 'pinia';
import useStateStore from './stores/state';
var createApp = Vue.createApp;
import axios from 'axios';
import App from './App.vue';
function main() {
    var app = createApp(App);
    var pinia = createPinia();
    app.use(pinia);
    app.config.globalProperties.$store = {
        state: useStateStore(),
    }
    var app0 = app.use(router).mount('#app');
    return { app: app0 }
}
var apps = main();