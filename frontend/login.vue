<script setup>
import axios from 'axios';
import global from './mixins/global';
import mixins from './mixins';
</script><template>
    <div class="login-form">
        <table>
            <tr>
                <th>id</th>
                <th>pw</th>
                <th></th>
            </tr>
            <tr>
                <input type="id" id="id" required>
            </tr>
            <tr>
                <input type="password" id="pw" required>
            </tr>
            <tr>
                <button class="btn btn-primary" @click="logInReq()">Sign in</button>
            </tr>
            <tr>
                <td colspan="3">
                    <a href="/join">Sign up</a>
                </td>
            </tr>
        </table>
    </div>
</template>
<script>
export default {
    mixins: [global, mixins],
    methods: {
        logInReq() {
            axios({
                url: "/api/loginReq", method: "post", data: {
                    id: document.querySelector("#id").value,
                    pw: document.querySelector("#pw").value,
                },
            }).then(data => {
                window.location.replace(data.data?.redirecturl);
                window.location.reload();
            });
        }
    },
}
</script>