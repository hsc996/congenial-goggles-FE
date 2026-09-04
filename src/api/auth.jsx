import api from './axiosInstance';

export const authAPI = {
    signup: async (firstName, lastName, email, password, { companyName, inviteCode } = {}) => {
        const endpoint = inviteCode ? '/auth/join' : '/auth/signup';
        const response = await api.post(endpoint, {
            firstName, lastName, email, password,
            ...(companyName ? { companyName } : {}),
            ...(inviteCode  ? { inviteCode  } : {}),
        });

        return response.data;
    },
    signin: async (email, password) => {
        const response = await api.post('/auth/signin', {
            email, password
        });

        return response.data;
    },
    requestPasswordReset: async (email) => {
        const response = await api.post('/auth/forgot-password', {
            email: email.trim()
        });

        return response.data;
    },
    resetPassword: async (token, newPassword) => {
        const response = await api.post('/auth/reset-password', {
            token, newPassword
        });

        return response.data;
    },
    refreshToken: async (refreshToken) => {
        const response = await api.post('/auth/refresh', {
            refreshToken
        });

        return response.data;
    },
    validateInvite: async (code) => {
        const response = await api.get('/auth/validate-invite', { params: { code } });
        return response.data;
    },
    logout: async () => {
        try {
            await api.post('/auth/logout');
        } catch {
            // proceed with local cleanup even if the server call fails
        } finally {
            localStorage.removeItem('userJwt');
            localStorage.removeItem('refreshToken');
        }
    }
}