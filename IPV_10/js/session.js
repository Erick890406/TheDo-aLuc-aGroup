// js/session.js

const Session = {
    businessName: null,
    password: null,
    isAdmin: false,
    currentDate: new Date().toISOString().split('T')[0],

    save() {
        localStorage.setItem('ipv_session', JSON.stringify({
            businessName: this.businessName,
            password: this.password
        }));
    },

    load() {
        const saved = localStorage.getItem('ipv_session');
        if (saved) {
            try {
                const sessionData = JSON.parse(saved);
                if (typeof sessionData.businessName === 'string' && sessionData.businessName.length > 0) {
                    this.businessName = sessionData.businessName;
                    this.password = sessionData.password;
                    return true;
                }
            } catch (e) {
                this.clear();
            }
        }
        return false;
    },

    clear() {
        this.businessName = null;
        this.password = null;
        this.isAdmin = false;
        localStorage.removeItem('ipv_session');
        localStorage.removeItem('ipv_last_selected_date');
    }
};

export default Session;