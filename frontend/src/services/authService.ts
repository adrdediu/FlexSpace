// src/services/authService.ts

interface UserInfo {
    username: string;
    first_name: string;
    last_name: string;
    email: string;
    is_staff: boolean;
    is_superuser: boolean;
    is_location_manager?: boolean;
    is_room_manager?: boolean;
    is_any_manager?: boolean;
    role: string;
    groups: string[];
}

interface LoginResponse {
    access?: string;
    username: string;
    first_name: string;
    last_name: string;
    email: string;
    is_staff: boolean;
    is_superuser: boolean;
    is_location_manager?: boolean;
    is_room_manager?: boolean;
    is_any_manager?: boolean;
    role: string;
    groups: string[];
}

class AuthService {
    private username: string| null = null;
    private first_name: string = "";
    private last_name: string ="";
    private email: string | null = null;
    private isAuthenticatedFlag: boolean = false;
    private is_staff: boolean = false;
    private is_superuser: boolean = false;
    private is_location_manager: boolean = false;
    private is_room_manager: boolean = false;
    private is_any_manager: boolean = false;
    private role: string = "";
    private groups: string[] = [];

    async login(username: string, password: string): Promise<LoginResponse> {
        try {
            const response = await fetch('/auth/login/', {
                method: 'POST',
                headers: {
                    'Content-Type':'application/json',
                },
                credentials:'include',
                body: JSON.stringify({username,password}),
            });
            if(!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || 'Login failed');
            }
            const data: LoginResponse = await response.json();

            this.username = data.username;
            this.email = data.email;
            this.isAuthenticatedFlag = true;

            return data;
        } catch (error) {
            console.error('Login error:',error);
            this.isAuthenticatedFlag = false;
            throw error;
        }
    }

    async logout(): Promise<boolean> {
        try {
            const response = await fetch('/auth/logout', {
                method: 'POST',
                credentials: 'include',
            });

            this.username = null;
            this.email = null;
            this.is_staff = false;
            this.is_superuser = false;
            this.is_location_manager = false;
            this.is_room_manager = false;
            this.is_any_manager = false;
            this.role = "";
            this.groups = [];
            this.isAuthenticatedFlag = false;

            import('./websocketService').then(module => {
                const webSocketService = module.default;
                webSocketService.disconnectAll();
            });

            return response.status === 205 || response.ok;
        } catch (error) {
            console.error('Logout error:', error);
            this.isAuthenticatedFlag = false;
            throw error;
        }
    }

    async refreshToken(): Promise<boolean> {
        try {
            const response = await fetch('/auth/token/refresh/', {
                method:'POST',
                credentials: 'include',
            });

            if(!response.ok) {
                this.isAuthenticatedFlag = false;
                return false;
            }

            this.isAuthenticatedFlag = true;
            import('./websocketService').then(module => {
                const webSocketService = module.default;
                webSocketService.reconnectAll();
            })

            return true;
        } catch(error) {
            console.error('Token refresh error:', error);
            this.isAuthenticatedFlag = false;
            return false;
        }
    }

    async getUserProfile(): Promise<UserInfo| null> {
        try {
            let response = await fetch('/auth/me', {
                credentials:'include',
            });

            if (response.status === 401) {
                const refreshed = await this.refreshToken();

                if(refreshed) {
                    response = await fetch('/auth/me', {
                        credentials: 'include',
                    });
                } else {
                    this.isAuthenticatedFlag = false;
                    return null;
                }
            }

            if(!response.ok) {
                this.isAuthenticatedFlag = false;
                return null;
            }

            const data: UserInfo = await response.json();
            this.username = data.username;
            this.email = data.email;
            this.first_name = data.first_name;
            this.last_name = data.last_name;
            this.is_staff = data.is_staff;
            this.is_superuser = data.is_superuser;
            this.is_location_manager = data.is_location_manager || false;
            this.is_room_manager = data.is_room_manager || false;
            this.is_any_manager = data.is_any_manager || false;
            this.role = data.role;
            this.groups = data.groups;
            this.isAuthenticatedFlag = true;

            return data;
        } catch(error) {
            console.error('Get User profile error', error);
            this.isAuthenticatedFlag = false;
            return null;
        }
    }

    async checkAuth(): Promise<boolean> {
        const profile = await this.getUserProfile();
        return profile !== null;
    }

    isAuthenticated(): boolean {
        return this.isAuthenticatedFlag;
    }

    getUserInfo(): UserInfo | null {
        if(!this.username || !this.email) {
            return null;
        }

        return{
            username: this.username,
            first_name: this.first_name,
            last_name: this.last_name,
            email: this.email,
            is_staff: this.is_staff,
            is_superuser: this.is_superuser,
            is_location_manager: this.is_location_manager,
            is_room_manager: this.is_room_manager,
            is_any_manager: this.is_any_manager,
            role: this.role,
            groups: this.groups,
        };
    }

    getUsername(): string | null {
        return this.username;
    }

    getEmail(): string | null {
        return this.email;
    }

}

export default new AuthService();