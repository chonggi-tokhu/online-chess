import * as Router from 'vue-router';
import form from '../form.vue';
var router = Router.createRouter({
    routes: [{
        path: '/login', component: form
    }, {
        path: '/join', component: form
    }],
    history: Router.createWebHistory(),
});
export default router;