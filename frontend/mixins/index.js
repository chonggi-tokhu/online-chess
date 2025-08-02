import global from './global';
import axios from 'axios';
export default {
    mixins: [global],
    methods: {
        fetchData(cbfunc) {
            axios({ url: "/api/data", method: "post", }).then(({ data }) => {
                console.log(data?.data);
                if (data?.data?.session) {
                    this.$store.state.$patch(state => {
                        state.session = data?.data.session;
                    });
                }
                if (data?.data?.session?.user) {
                    this.$store.state.$patch(state => {
                        state.session.user = data?.data.session.user;
                    });
                }
                if (typeof cbfunc === 'function') {
                    cbfunc();
                }
            });
        }
    }
}