import axios from 'axios';
import { defineStore } from 'pinia';
var useStateStore = defineStore('state', {
    state: function () {
        return {
            session: {
                user: null,
                curr_chat_pwcode: false,
            },
        }
    },
    actions: {
        setSessionProp(key, val) {
            if (typeof key !== 'string' && !(key instanceof String)) {
                return false;
            }
            var keys = key.split('.');
            var valToAdd = val;
            var firstKey = keys[0];
            var reversedVal = this.session[firstKey];
            for (var i = 0, akey = keys.reverse()[i]; i < keys.length - 1; i++, akey = keys.reverse()[i]) {
                for (var i2 = 1, akey2 = keys[i]; i2 < keys.length + 1 - i; i++, akey2 = keys[i2]) {
                    reversedVal = reversedVal[akey2];
                }
                var objToAdd = reversedVal[keys[keys.length - i + 1]];
                objToAdd[akey] = valToAdd;
                valToAdd = objToAdd;
            }
            this.session[firstKey] = valToAdd;
        },
    },
});
export default useStateStore;