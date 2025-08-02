<script setup>
import axios from 'axios';
import global from './mixins/global/index';
import mixins from './mixins/index';
import login from './login.vue';
import join from './join.vue';
</script>
<template>
    <template v-if="pageMode === 'login'">
        <login />
    </template>
    <template v-else-if="pageMode === 'join'">
        <join />
    </template>
    <template v-else>
        <a href="/login">Sign in</a>
    </template>
</template>
<script>
export default {
    mixins: [global, mixins],
    data() {
        var pagePath = decodeURI(this.$route.path);
        return {
            pageMode: pagePath.replace('/', ''),
        }
    }
}
</script>